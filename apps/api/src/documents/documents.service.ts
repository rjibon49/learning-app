
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { PDFDocument } from 'pdf-lib';

import {
  createHash,
  randomUUID,
} from 'node:crypto';

import { execFile } from 'node:child_process';
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import * as yauzl from 'yauzl';

import { PrismaService } from '../prisma.service.js';

import type {
  DocumentJobsQuery,
  UploadDocumentInput,
} from './documents.schemas.js';

const execFileAsync = promisify(execFile);

type OfficeKind = 'docx' | 'pptx' | 'xlsx';

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 35 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 150 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 3000;
const JOB_LOCK_MS = 3 * 60 * 1000;

const MIME_TYPES: Record<OfficeKind, string> = {
  docx:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx:
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

@Injectable()
export class DocumentsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const accountId =
      config.getOrThrow<string>('R2_ACCOUNT_ID');

    this.bucket =
      config.getOrThrow<string>('R2_BUCKET_NAME');

    this.baseUrl = config
      .getOrThrow<string>('MEDIA_API_BASE_URL')
      .replace(/\/+$/, '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint:
        `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId:
          config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey:
          config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  // ======================================
  // Security: Office ZIP validation
  // ======================================

  private validateOfficeBuffer(
    buffer: Buffer,
    kind: OfficeKind,
  ): Promise<void> {
    if (
      buffer.length < 4 ||
      !buffer.subarray(0, 4).equals(
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      )
    ) {
      throw new BadRequestException(
        'Invalid Office file signature',
      );
    }

    return new Promise<void>((resolve, reject) => {
      yauzl.fromBuffer(
        buffer,
        {
          lazyEntries: true,
          validateEntrySizes: true,
        },
        (error, zip) => {
          if (error || !zip) {
            reject(
              new BadRequestException(
                'Invalid Office ZIP structure',
              ),
            );
            return;
          }

          let settled = false;
          let entries = 0;
          let expandedSize = 0;

          const names = new Set<string>();

          const fail = (message: string) => {
            if (settled) return;
            settled = true;
            zip.close();
            reject(new BadRequestException(message));
          };

          zip.on('error', () => {
            fail('Office archive is damaged');
          });

          zip.on('entry', (entry) => {
            if (settled) return;

            entries += 1;
            expandedSize += entry.uncompressedSize;

            if (
              entries > MAX_ZIP_ENTRIES ||
              expandedSize > MAX_EXPANDED_BYTES ||
              entry.uncompressedSize >
                50 * 1024 * 1024
            ) {
              fail('Office archive exceeds safety limits');
              return;
            }

            const filename = entry.fileName;

            const segments = filename.split('/');

            if (
              filename.startsWith('/') ||
              filename.includes('\\') ||
              segments.includes('..') ||
              filename.includes('\0')
            ) {
              fail('Unsafe Office archive path');
              return;
            }

            if (entry.isEncrypted()) {
              fail('Encrypted Office files are not supported');
              return;
            }

            const unixMode =
              (entry.externalFileAttributes >>> 16) & 0xffff;

            if ((unixMode & 0o170000) === 0o120000) {
              fail('Archive symbolic links are not permitted');
              return;
            }

            if (/vbaproject\.bin$/i.test(filename)) {
              fail('Macro-enabled Office content is prohibited');
              return;
            }

            names.add(filename);
            zip.readEntry();
          });

          zip.on('end', () => {
            if (settled) return;

            const marker: Record<OfficeKind, string> = {
              docx: 'word/document.xml',
              pptx: 'ppt/presentation.xml',
              xlsx: 'xl/workbook.xml',
            };

            if (
              !names.has('[Content_Types].xml') ||
              !names.has(marker[kind])
            ) {
              fail('File content does not match its Office type');
              return;
            }

            settled = true;
            zip.close();
            resolve();
          });

          zip.readEntry();
        },
      );
    });
  }

  // ======================================
  // Malware scanning
  // ======================================

  private async scan(
    buffer: Buffer,
    filename: string,
  ): Promise<void> {
    const scanner =
      this.config.get<string>('MEDIA_SCANNER_BINARY');

    const production =
      this.config.get<string>('NODE_ENV') ===
      'production';

    if (!scanner) {
      if (production) {
        throw new ServiceUnavailableException(
          'Antivirus scanner is required in production',
        );
      }

      return;
    }

    const directory = await mkdtemp(
      join(tmpdir(), 'learning-scan-'),
    );

    const path = join(directory, filename);

    try {
      await writeFile(path, buffer, { mode: 0o600 });

      await execFileAsync(
        scanner,
        ['--no-summary', path],
        {
          timeout: 60000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        },
      );
    } catch (error: unknown) {
      const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error
          ? error.code
          : undefined;

      if (code === 1 || code === '1') {
        throw new BadRequestException(
          'Malware detected in uploaded document',
        );
      }

      throw new ServiceUnavailableException(
        'Antivirus scanner failed',
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  }

  // ======================================
  // Admin upload and queue
  // ======================================

  async upload(
    file: Express.Multer.File,
    options: UploadDocumentInput,
  ) {
    if (
      !file?.buffer?.length ||
      file.buffer.length > MAX_INPUT_BYTES
    ) {
      throw new BadRequestException(
        'Office file must be between 1 byte and 20 MB',
      );
    }

    const extension = file.originalname
      .split('.')
      .pop()
      ?.toLowerCase();

    if (
      extension !== 'docx' &&
      extension !== 'pptx' &&
      extension !== 'xlsx'
    ) {
      throw new BadRequestException(
        'Only DOCX, PPTX and XLSX files are supported',
      );
    }

    await this.validateOfficeBuffer(
      file.buffer,
      extension,
    );

    await this.scan(
      file.buffer,
      `input.${extension}`,
    );

    if (options.appId) {
      const app = await this.prisma.app.findUnique({
        where: { id: options.appId },
        select: { id: true },
      });

      if (!app) {
        throw new BadRequestException(
          'Application does not exist',
        );
      }
    }

    const objectKey =
      `learning-platform/documents/source/` +
      `${randomUUID()}.${extension}`;

    const checksum = createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: file.buffer,
          ContentType: MIME_TYPES[extension],
          CacheControl: 'private, no-store',
        }),
      );
    } catch {
      throw new ServiceUnavailableException(
        'Failed to store document in R2',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const asset = await tx.mediaAsset.create({
            data: {
              appId: options.appId ?? null,
              type: 'DOCUMENT',
              visibility: 'PRIVATE',
              status: 'PROCESSING',

              storageProvider: 'R2',
              bucket: this.bucket,
              objectKey,

              originalName:
                file.originalname.slice(0, 255),

              originalMimeType: MIME_TYPES[extension],
              mimeType: MIME_TYPES[extension],

              originalSize: BigInt(file.buffer.length),
              fileSize: BigInt(file.buffer.length),
              checksumSha256: checksum,
            },
          });

          const job = await tx.backgroundJob.create({
            data: {
              appId: options.appId ?? null,
              type: 'PROCESS_DOCUMENT',
              status: 'PENDING',
              entityType: 'MediaAsset',
              entityId: asset.id,
              maxAttempts: 3,
              payload: {
                outputVisibility: options.visibility,
              },
            },
          });

          return {
            sourceAssetId: asset.id,
            jobId: job.id,
            status: job.status,
            message: 'Document conversion queued',
          };
        },
      );
    } catch {
      try {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
          }),
        );
      } catch {
        // Reconciliation may be required.
      }

      throw new ServiceUnavailableException(
        'Failed to create document conversion job',
      );
    }
  }

  // ======================================
  // Admin job information
  // ======================================

  async findJobs(query: DocumentJobsQuery) {
    const where = {
      type: 'PROCESS_DOCUMENT' as const,
      ...(query.status ? { status: query.status } : {}),
    };

    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.backgroundJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.backgroundJob.count({ where }),
    ]);

    return {
      data: jobs,
      pagination: {
        ...query,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findJob(id: string) {
    const job = await this.prisma.backgroundJob.findFirst({
      where: {
        id,
        type: 'PROCESS_DOCUMENT',
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  // ======================================
  // Claim a conversion job
  // ======================================

  async processNextJob(): Promise<boolean> {
    const now = new Date();

    const candidate =
      await this.prisma.backgroundJob.findFirst({
        where: {
          type: 'PROCESS_DOCUMENT',
          scheduledAt: { lte: now },
          attempts: { lt: 3 },
          OR: [
            { status: 'PENDING' },
            {
              status: 'PROCESSING',
              lockedUntil: { lt: now },
            },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });

    if (!candidate) return false;

    const claimed =
      await this.prisma.backgroundJob.updateMany({
        where: {
          id: candidate.id,
          attempts: { lt: candidate.maxAttempts },
          OR: [
            { status: 'PENDING' },
            {
              status: 'PROCESSING',
              lockedUntil: { lt: now },
            },
          ],
        },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
          startedAt: now,
          lockedUntil: new Date(
            now.getTime() + JOB_LOCK_MS,
          ),
        },
      });

    if (claimed.count !== 1) return true;

    try {
      await this.convertJob(candidate.id);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Unknown document conversion error';

      const current =
        await this.prisma.backgroundJob.findUnique({
          where: { id: candidate.id },
        });

      const terminal =
        !current ||
        current.attempts >= current.maxAttempts;

      await this.prisma.backgroundJob.update({
        where: { id: candidate.id },
        data: {
          status: terminal ? 'FAILED' : 'PENDING',
          lockedUntil: null,
          errorMessage: message,
          scheduledAt: new Date(
            Date.now() +
              Math.min(60000, (current?.attempts ?? 1) * 15000),
          ),
        },
      });

      if (terminal && candidate.entityId) {
        await this.prisma.mediaAsset.updateMany({
          where: { id: candidate.entityId },
          data: {
            status: 'FAILED',
            processingError: message,
          },
        });
      }
    }

    return true;
  }

  // ======================================
  // Convert Office document to PDF
  // ======================================

  private async convertJob(jobId: string) {
    const job = await this.findJob(jobId);

    if (!job.entityId) {
      throw new Error('Source MediaAsset ID is missing');
    }

    const source =
      await this.prisma.mediaAsset.findUnique({
        where: { id: job.entityId },
      });

    if (!source) {
      throw new Error('Source MediaAsset not found');
    }

    const extension = source.objectKey
      .split('.')
      .pop()
      ?.toLowerCase();

    if (
      extension !== 'docx' &&
      extension !== 'pptx' &&
      extension !== 'xlsx'
    ) {
      throw new Error('Unsupported stored document format');
    }

    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: source.bucket ?? this.bucket,
        Key: source.objectKey,
      }),
    );

    if (!response.Body) {
      throw new Error('R2 object is empty');
    }

    const input = Buffer.from(
      await response.Body.transformToByteArray(),
    );

    if (input.length > MAX_INPUT_BYTES) {
      throw new Error('Stored input exceeds size limit');
    }

    await this.validateOfficeBuffer(input, extension);
    await this.scan(input, `source.${extension}`);

    const directory = await mkdtemp(
      join(tmpdir(), 'learning-convert-'),
    );

    const inputPath = join(
      directory,
      `document.${extension}`,
    );

    const outputPath = join(directory, 'document.pdf');

    const profile = join(directory, 'lo-profile');

    try {
      await writeFile(inputPath, input, {
        mode: 0o600,
      });

      const binary =
        this.config.get<string>('LIBREOFFICE_BINARY') ||
        'soffice';

      await execFileAsync(
        binary,
        [
          `-env:UserInstallation=file://${profile.replace(/\\/g, '/')}`,
          '--headless',
          '--convert-to',
          'pdf',
          '--outdir',
          directory,
          inputPath,
        ],
        {
          timeout: 90000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
          cwd: directory,
        },
      );

      const pdfBuffer = await readFile(outputPath);

      if (
        pdfBuffer.length === 0 ||
        pdfBuffer.length > MAX_OUTPUT_BYTES
      ) {
        throw new Error('Generated PDF size is invalid');
      }

      const pdf = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: false,
        updateMetadata: false,
      });

      const pageCount = pdf.getPageCount();

      if (pageCount < 1 || pageCount > 1000) {
        throw new Error('Generated PDF page count is invalid');
      }

      await this.scan(pdfBuffer, 'output.pdf');

      const outputKey =
        `learning-platform/documents/pdf/` +
        `${job.id}.pdf`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: outputKey,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
          CacheControl: 'private, no-store',
        }),
      );

      const payload = job.payload;
      const visibility =
        payload &&
        typeof payload === 'object' &&
        !Array.isArray(payload) &&
        'outputVisibility' in payload &&
        payload.outputVisibility === 'PUBLIC'
          ? 'PUBLIC'
          : 'PRIVATE';

      const checksum = createHash('sha256')
        .update(pdfBuffer)
        .digest('hex');

      try {
        await this.prisma.$transaction(async (tx) => {
          const existing =
            await tx.mediaAsset.findUnique({
              where: { objectKey: outputKey },
            });

          const resultAsset = existing
            ? existing
            : await tx.mediaAsset.create({
                data: {
                  appId: source.appId,
                  type: 'PDF',
                  visibility,
                  status: 'READY',
                  storageProvider: 'R2',
                  bucket: this.bucket,
                  objectKey: outputKey,

                  originalName:
                    (source.originalName ?? 'document')
                      .replace(/\.[^.]+$/, '') + '.pdf',

                  originalMimeType:
                    source.originalMimeType,
                  mimeType: 'application/pdf',

                  originalSize: source.fileSize,
                  fileSize: BigInt(pdfBuffer.length),
                  pageCount,
                  checksumSha256: checksum,
                },
              });

          if (visibility === 'PUBLIC') {
            await tx.mediaAsset.update({
              where: { id: resultAsset.id },
              data: {
                publicUrl:
                  `${this.baseUrl}/media/public/${resultAsset.id}`,
              },
            });
          }

          await tx.mediaAsset.update({
            where: { id: source.id },
            data: {
              status: 'READY',
              processingError: null,
            },
          });

          await tx.backgroundJob.update({
            where: { id: job.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              lockedUntil: null,
              errorMessage: null,
              result: {
                sourceAssetId: source.id,
                pdfAssetId: resultAsset.id,
                pageCount,
              },
            },
          });
        });
      } catch (error) {
        // The deterministic output key permits
        // retry/reconciliation if the DB write fails.
        throw error;
      }
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  }
}
