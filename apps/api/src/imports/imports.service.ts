
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import {
  Prisma,
  type Difficulty,
} from '../generated/prisma/client.js';

import {
  importVocabularyItemSchema,
  type CreateVocabularyImportInput,
  type ImportVocabularyItem,
  type ImportJobsQuery,
} from './imports.schemas.js';

const JOB_TYPE = 'BULK_IMPORT' as const;
const LOCK_DURATION_MS = 10 * 60 * 1000;
const MAX_REPORTED_ERRORS = 30;

type ImportPayload = {
  importId: string;
  languageId: string;
  items: ImportVocabularyItem[];
};

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ======================================
  // ADMIN: CREATE IMPORT JOB
  // ======================================

  async importVocabulary(
    input: CreateVocabularyImportInput,
  ) {
    const app = await this.prisma.app.findUnique({
      where: { id: input.appId },
      include: {
        language: true,
      },
    });

    if (
      !app ||
      !app.isActive ||
      !app.language.isActive
    ) {
      throw new BadRequestException(
        'Application or learning language is invalid',
      );
    }

    const languageCodes = new Set<string>();

    for (const item of input.items) {
      for (const translation of item.translations) {
        languageCodes.add(translation.languageCode);
      }

      for (const example of item.examples) {
        languageCodes.add(example.languageCode);
      }
    }

    const languages = await this.prisma.language.findMany({
      where: {
        code: { in: Array.from(languageCodes) },
        isActive: true,
      },
      select: {
        code: true,
      },
    });

    if (languages.length !== languageCodes.size) {
      throw new BadRequestException(
        'One or more translation/example languages are unavailable',
      );
    }

    const payloadItems = input.items;

    return this.prisma.$transaction(async (tx) => {
      const importJob = await tx.bulkImportJob.create({
        data: {
          appId: app.id,
          filename: input.filename,
          status: 'PENDING',
          totalRows: payloadItems.length,
          processedRows: 0,
          successRows: 0,
          failedRows: 0,
          metadata: {
            importFormat: 'JSON',
            languageCode: app.language.code,
          },
        },
      });

      const backgroundJob = await tx.backgroundJob.create({
        data: {
          appId: app.id,
          type: JOB_TYPE,
          status: 'PENDING',
          entityType: 'BulkImportJob',
          entityId: importJob.id,
          maxAttempts: 3,
          payload: {
            importId: importJob.id,
            languageId: app.languageId,
            items: payloadItems,
          } as Prisma.InputJsonObject,
        },
      });

      return {
        importId: importJob.id,
        backgroundJobId: backgroundJob.id,
        status: 'PENDING',
        totalRows: payloadItems.length,
        message: 'Vocabulary import queued',
      };
    });
  }

  // ======================================
  // ADMIN: IMPORT HISTORY
  // ======================================

  async findJobs(query: ImportJobsQuery) {
    const where: Prisma.BulkImportJobWhereInput = {
      ...(query.appId ? { appId: query.appId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.bulkImportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.bulkImportJob.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findJob(id: string) {
    const job = await this.prisma.bulkImportJob.findUnique({
      where: { id },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    const background = await this.prisma.backgroundJob.findFirst({
      where: {
        entityId: id,
        entityType: 'BulkImportJob',
        type: JOB_TYPE,
      },
      select: {
        id: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        errorMessage: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return {
      ...job,
      backgroundJob: background,
    };
  }

  // ======================================
  // WORKER: CLAIM ONE JOB
  // ======================================

  async processNextJob(): Promise<boolean> {
    const now = new Date();

    const candidate =
      await this.prisma.backgroundJob.findFirst({
        where: {
          type: JOB_TYPE,
          scheduledAt: { lte: now },
          status: 'PENDING',
          attempts: { lt: 3 },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          maxAttempts: true,
        },
      });

    if (!candidate) return false;

    const claimed =
      await this.prisma.backgroundJob.updateMany({
        where: {
          id: candidate.id,
          status: 'PENDING',
          attempts: { lt: candidate.maxAttempts },
        },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
          startedAt: now,
          lockedUntil: new Date(
            now.getTime() + LOCK_DURATION_MS,
          ),
        },
      });

    if (claimed.count !== 1) {
      return true;
    }

    try {
      await this.processClaimedJob(candidate.id);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Unknown import processing error';

      const current =
        await this.prisma.backgroundJob.findUnique({
          where: { id: candidate.id },
          select: {
            attempts: true,
            maxAttempts: true,
            entityId: true,
          },
        });

      const failedPermanently =
        !current ||
        current.attempts >= current.maxAttempts;

      await this.prisma.backgroundJob.updateMany({
        where: {
          id: candidate.id,
          status: 'PROCESSING',
        },
        data: {
          status: failedPermanently
            ? 'FAILED'
            : 'PENDING',
          errorMessage: message,
          lockedUntil: null,
          scheduledAt: new Date(Date.now() + 30000),
        },
      });

      if (current?.entityId) {
        await this.prisma.bulkImportJob.updateMany({
          where: { id: current.entityId },
          data: {
            status: failedPermanently
              ? 'FAILED'
              : 'PENDING',
          },
        });
      }
    }

    return true;
  }

  // ======================================
  // WORKER: RESOLVE JOB PAYLOAD
  // ======================================

  private async readPayload(
    jobId: string,
  ): Promise<ImportPayload> {
    const job = await this.prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });

    if (
      !job ||
      job.type !== JOB_TYPE ||
      !job.entityId ||
      !job.payload ||
      typeof job.payload !== 'object' ||
      Array.isArray(job.payload)
    ) {
      throw new Error('Invalid import job payload');
    }

    const raw = job.payload;

    const rawItems =
      'items' in raw ? raw.items : undefined;

    const rawLanguageId =
      'languageId' in raw
        ? raw.languageId
        : undefined;

    if (
      !Array.isArray(rawItems) ||
      typeof rawLanguageId !== 'string'
    ) {
      throw new Error('Invalid vocabulary import payload');
    }

    const items = rawItems.map((item) =>
      importVocabularyItemSchema.parse(item),
    );

    if (items.length > 100) {
      throw new Error('Import batch exceeds configured limit');
    }

    return {
      importId: job.entityId,
      languageId: rawLanguageId,
      items,
    };
  }

  // ======================================
  // WORKER: PROCESS ROWS
  // ======================================

  private async processClaimedJob(
    backgroundJobId: string,
  ): Promise<void> {
    const payload =
      await this.readPayload(backgroundJobId);

    const importJob =
      await this.prisma.bulkImportJob.findUniqueOrThrow({
        where: { id: payload.importId },
      });

    if (importJob.totalRows !== payload.items.length) {
      throw new Error('Import row count mismatch');
    }

    await this.prisma.bulkImportJob.update({
      where: { id: payload.importId },
      data: { status: 'PROCESSING' },
    });

    const languages = await this.prisma.language.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    });

    const languageMap = new Map(
      languages.map((language) => [
        language.code,
        language.id,
      ]),
    );

    // Both success and failure advance the cursor.
    // Rows committed in previous runs are not repeated.
    let index =
      importJob.processedRows + importJob.failedRows;

    while (index < payload.items.length) {
      const row = payload.items[index];

      try {
        await this.prisma.$transaction(async (tx) => {
          // A learner vocabulary record is created as DRAFT.
          const vocabulary = await tx.vocabulary.create({
            data: {
              languageId: payload.languageId,
              categoryId: row.categoryId ?? null,
              lessonId: row.lessonId ?? null,
              term: row.term,
              pronunciation: row.pronunciation ?? null,
              partOfSpeech: row.partOfSpeech ?? null,
              difficulty: row.difficulty as Difficulty,
              notes: row.notes ?? null,
              grammar:
                row.grammar === null
                  ? Prisma.DbNull
                  : (row.grammar ?? Prisma.DbNull),
              status: 'DRAFT',
              isPublished: false,
            },
          });

          for (
            const [position, translation]
            of row.translations.entries()
          ) {
            const languageId =
              languageMap.get(translation.languageCode);

            if (!languageId) {
              throw new Error(
                `Unknown language: ${translation.languageCode}`,
              );
            }

            await tx.vocabularyTranslation.create({
              data: {
                vocabularyId: vocabulary.id,
                languageId,
                meaning: translation.meaning,
                notes: translation.notes ?? null,
                sortOrder: position,
              },
            });
          }

          for (
            const [position, example]
            of row.examples.entries()
          ) {
            const languageId =
              languageMap.get(example.languageCode);

            if (!languageId) {
              throw new Error(
                `Unknown example language: ${example.languageCode}`,
              );
            }

            await tx.vocabularyExample.create({
              data: {
                vocabularyId: vocabulary.id,
                languageId,
                text: example.text,
                translationGroupId:
                  example.translationGroupId ?? null,
                sortOrder: position,
              },
            });
          }

          await tx.bulkImportJob.update({
            where: { id: payload.importId },
            data: {
              processedRows: { increment: 1 },
              successRows: { increment: 1 },
            },
          });
        });
      } catch (error: unknown) {
        const message = error instanceof Error
          ? error.message.slice(0, 300)
          : 'Unable to import row';

        // Failure count is stored separately so the
        // import can be resumed without repeating
        // successful rows.
        await this.prisma.$transaction(async (tx) => {
          const latest = await tx.bulkImportJob.findUniqueOrThrow({
            where: { id: payload.importId },
            select: { errorReport: true },
          });

          const previous = Array.isArray(latest.errorReport)
            ? latest.errorReport
            : [];

          const errors = [
            ...previous,
            { row: index + 1, error: message },
          ].slice(0, MAX_REPORTED_ERRORS);

          await tx.bulkImportJob.update({
            where: { id: payload.importId },
            data: {
              failedRows: { increment: 1 },
              errorReport: errors,
            },
          });
        });
      }

      index += 1;

      // Extend the lease while actively processing.
      await this.prisma.backgroundJob.updateMany({
        where: {
          id: backgroundJobId,
          status: 'PROCESSING',
        },
        data: {
          lockedUntil: new Date(
            Date.now() + LOCK_DURATION_MS,
          ),
        },
      });
    }

    const completed =
      await this.prisma.bulkImportJob.findUniqueOrThrow({
        where: { id: payload.importId },
      });

    const resultStatus =
      completed.failedRows === 0
        ? 'COMPLETED'
        : completed.successRows === 0
          ? 'FAILED'
          : 'PARTIAL';

    await this.prisma.$transaction(async (tx) => {
      await tx.bulkImportJob.update({
        where: { id: payload.importId },
        data: { status: resultStatus },
      });

      await tx.backgroundJob.update({
        where: { id: backgroundJobId },
        data: {
          status: resultStatus === 'FAILED'
            ? 'FAILED'
            : 'COMPLETED',
          completedAt: new Date(),
          lockedUntil: null,
          result: {
            importId: payload.importId,
            successRows: completed.successRows,
            failedRows: completed.failedRows,
            status: resultStatus,
          },
        },
      });
    });
  }
}
