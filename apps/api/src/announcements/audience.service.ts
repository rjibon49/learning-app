
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  CreateAudienceInput,
  UpdateAudienceInput,
  AudienceListInput,
  AnnouncementTargetsInput,
} from './audience.schemas.js';

import {
  audienceRulesSchema,
} from './audience.schemas.js';

@Injectable()
export class AudienceService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ======================================
  // VALIDATE REFERENCED ENTITIES
  // ======================================

  private async validateReferences(
    rules: CreateAudienceInput['rules'],
  ) {
    for (const condition of rules.conditions) {
      const { field, value } = condition;

      if (field === 'appId') {
        const found = await this.prisma.app.findUnique({
          where: { id: value },
          select: { id: true },
        });

        if (!found) {
          throw new BadRequestException(
            `App not found: ${value}`,
          );
        }
      }

      if (field === 'languageId') {
        const found =
          await this.prisma.language.findUnique({
            where: { id: value },
            select: { id: true },
          });

        if (!found) {
          throw new BadRequestException(
            `Language not found: ${value}`,
          );
        }
      }

      if (field === 'levelId') {
        const found =
          await this.prisma.proficiencyLevel.findUnique({
            where: { id: value },
            select: { id: true },
          });

        if (!found) {
          throw new BadRequestException(
            `Level not found: ${value}`,
          );
        }
      }
    }
  }

  // ======================================
  // LIST SEGMENTS
  // ======================================

  async list(query: AudienceListInput) {
    const [data, total] = await Promise.all([
      this.prisma.audienceSegment.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: {
            select: { targets: true },
          },
        },
      }),

      this.prisma.audienceSegment.count(),
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

  // ======================================
  // GET SEGMENT
  // ======================================

  async findOne(id: string) {
    const result =
      await this.prisma.audienceSegment.findUnique({
        where: { id },
        include: {
          _count: {
            select: { targets: true },
          },
        },
      });

    if (!result) {
      throw new NotFoundException(
        'Audience segment not found.',
      );
    }

    return result;
  }

  // ======================================
  // CREATE SEGMENT
  // ======================================

  async create(input: CreateAudienceInput) {
    await this.validateReferences(input.rules);

    const existing =
      await this.prisma.audienceSegment.findUnique({
        where: {
          segmentKey: input.segmentKey,
        },
        select: { id: true },
      });

    if (existing) {
      throw new ConflictException(
        'Segment key already exists.',
      );
    }

    return this.prisma.audienceSegment.create({
      data: {
        segmentKey: input.segmentKey,
        name: input.name,
        description: input.description ?? null,
        rulesVersion: 1,
        rulesJson: input.rules,
        isActive: false,
      },
    });
  }

  // ======================================
  // UPDATE SEGMENT
  // ======================================

  async update(
    id: string,
    input: UpdateAudienceInput,
  ) {
    const current = await this.findOne(id);

    if (current._count.targets > 0) {
      throw new ConflictException(
        'This segment is attached to announcements. Detach it before changing its rules.',
      );
    }

    await this.validateReferences(input.rules);

    const result =
      await this.prisma.audienceSegment.updateMany({
        where: {
          id,
          targets: { none: {} },
        },
        data: {
          name: input.name,
          description: input.description ?? null,
          rulesVersion: 1,
          rulesJson: input.rules,
        },
      });

    if (result.count !== 1) {
      throw new ConflictException(
        'Segment changed during update.',
      );
    }

    return this.findOne(id);
  }

  // ======================================
  // ACTIVATE / DEACTIVATE
  // ======================================

  async setActive(id: string, isActive: boolean) {
    const segment = await this.findOne(id);

    if (isActive) {
      const valid = audienceRulesSchema.safeParse(
        segment.rulesJson,
      );

      if (!valid.success || segment.rulesVersion !== 1) {
        throw new BadRequestException(
          'Unsupported audience rules version.',
        );
      }

      await this.validateReferences(valid.data);
    }

    await this.prisma.audienceSegment.update({
      where: { id },
      data: { isActive },
    });

    return this.findOne(id);
  }

  // ======================================
  // LINK SEGMENTS TO ANNOUNCEMENT
  // ======================================

  async setAnnouncementTargets(
    announcementId: string,
    input: AnnouncementTargetsInput,
  ) {
    const requestedIds =
      input.targets.map(x => x.segmentId);

    // Validate all selected segments.
    if (requestedIds.length > 0) {
      const segments =
        await this.prisma.audienceSegment.findMany({
          where: { id: { in: requestedIds } },
        });

      if (segments.length !== requestedIds.length) {
        throw new BadRequestException(
          'One or more audience segments do not exist.',
        );
      }

      for (const segment of segments) {
        const parsed = audienceRulesSchema.safeParse(
          segment.rulesJson,
        );

        if (
          !segment.isActive ||
          segment.rulesVersion !== 1 ||
          !parsed.success
        ) {
          throw new BadRequestException(
            `Segment is not ready: ${segment.name}`,
          );
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const announcement =
        await tx.announcement.findUnique({
          where: { id: announcementId },
          select: { status: true },
        });

      if (!announcement) {
        throw new NotFoundException(
          'Announcement not found.',
        );
      }

      if (
        announcement.status !== 'DRAFT' &&
        announcement.status !== 'PAUSED'
      ) {
        throw new ConflictException(
          'Only draft or paused announcements can change targeting.',
        );
      }

      // Lock publication state until transaction commits.
      const changed =
        await tx.announcement.updateMany({
          where: {
            id: announcementId,
            status: { in: ['DRAFT', 'PAUSED'] },
          },
          data: {
            status: 'DRAFT',
          },
        });

      if (changed.count !== 1) {
        throw new ConflictException(
          'Announcement state changed.',
        );
      }

      await tx.announcementTarget.deleteMany({
        where: { announcementId },
      });

      if (input.targets.length > 0) {
        await tx.announcementTarget.createMany({
          data: input.targets.map(target => ({
            announcementId,
            segmentId: target.segmentId,
            exclude: target.exclude,
          })),
        });
      }
    });

    return this.prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        targets: {
          include: {
            segment: true,
          },
        },
      },
    });
  }
}
