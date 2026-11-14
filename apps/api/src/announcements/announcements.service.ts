
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';
import { audienceRulesSchema } from './audience.schemas.js';

import type {
  AnnouncementInput,
  AnnouncementListQuery,
} from './announcements.schemas.js';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    translations: true,
    placements: true,
    promotions: {
      include: {
        promoCode: {
          select: {
            id: true,
            code: true,
            isActive: true,
            validFrom: true,
            validUntil: true,
          },
        },
      },
    },
    targets: true,
  } as const;

  async list(query: AnnouncementListQuery) {
    const where = query.status
      ? { status: query.status }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        include: this.include,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.announcement.count({ where }),
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

  async findOne(id: string) {
    const announcement =
      await this.prisma.announcement.findUnique({
        where: { id },
        include: this.include,
      });

    if (!announcement) {
      throw new NotFoundException(
        'Announcement not found',
      );
    }

    return announcement;
  }

  private async checkReferences(input: AnnouncementInput) {
    if (input.imageAssetId) {
      const image = await this.prisma.mediaAsset.findUnique({
        where: { id: input.imageAssetId },
        select: {
          type: true,
          visibility: true,
          status: true,
        },
      });

      if (
        !image ||
        image.type !== 'IMAGE' ||
        image.visibility !== 'PUBLIC' ||
        image.status !== 'READY'
      ) {
        throw new BadRequestException(
          'Announcement image must be PUBLIC and READY.',
        );
      }
    }

    if (input.promoCodeIds.length > 0) {
      const count = await this.prisma.promoCode.count({
        where: {
          id: { in: input.promoCodeIds },
        },
      });

      if (count !== input.promoCodeIds.length) {
        throw new BadRequestException(
          'One or more promotion codes do not exist.',
        );
      }
    }

    if (
      input.kind === 'PROMOTION' &&
      input.promoCodeIds.length === 0
    ) {
      throw new BadRequestException(
        'Promotional announcements must reference a promotion code.',
      );
    }

    if (
      input.purpose !== 'MARKETING' &&
      input.promoCodeIds.length > 0
    ) {
      throw new BadRequestException(
        'Promotion codes require MARKETING purpose.',
      );
    }
  }

  private children(input: AnnouncementInput) {
    return {
      translations: {
        create: input.translations.map(x => ({
          locale: x.locale,
          title: x.title,
          message: x.message,
          actionLabel: x.actionLabel ?? null,
        })),
      },
      placements: {
        create: input.placements.map(x => ({
          channel: x.channel,
          placementKey: x.placementKey,
          isEnabled: x.isEnabled,
        })),
      },
      promotions: {
        create: input.promoCodeIds.map(id => ({
          promoCodeId: id,
        })),
      },
    };
  }

  async create(input: AnnouncementInput) {
    await this.checkReferences(input);

    const exists = await this.prisma.announcement.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException(
        'Announcement slug already exists.',
      );
    }

    const result = await this.prisma.announcement.create({
      data: {
        slug: input.slug,
        kind: input.kind,
        purpose: input.purpose,
        status: 'DRAFT',
        priority: input.priority,
        isDismissible: input.isDismissible,
        startsAt: input.startsAt
          ? new Date(input.startsAt)
          : null,
        endsAt: input.endsAt
          ? new Date(input.endsAt)
          : null,
        actionType: input.actionType ?? null,
        actionValue: input.actionValue ?? null,
        imageAssetId: input.imageAssetId ?? null,
        ...this.children(input),
      },
      select: { id: true },
    });

    return this.findOne(result.id);
  }

  async update(id: string, input: AnnouncementInput) {
    const existing = await this.findOne(id);

    if (existing.status !== 'DRAFT' &&
        existing.status !== 'PAUSED') {
      throw new ConflictException(
        'Pause an announcement before editing it.',
      );
    }

    if (existing.targets.length > 0) {
      throw new ConflictException(
        'Targeted announcements require the audience editor.',
      );
    }

    await this.checkReferences(input);

    await this.prisma.$transaction(async tx => {
      const changed = await tx.announcement.updateMany({
        where: {
          id,
          status: { in: ['DRAFT', 'PAUSED'] },
        },
        data: {
          slug: input.slug,
          kind: input.kind,
          purpose: input.purpose,
          priority: input.priority,
          isDismissible: input.isDismissible,
          startsAt: input.startsAt
            ? new Date(input.startsAt)
            : null,
          endsAt: input.endsAt
            ? new Date(input.endsAt)
            : null,
          actionType: input.actionType ?? null,
          actionValue: input.actionValue ?? null,
          imageAssetId: input.imageAssetId ?? null,
        },
      });

      if (changed.count !== 1) {
        throw new ConflictException(
          'Announcement state changed.',
        );
      }

      await tx.announcementTranslation.deleteMany({
        where: { announcementId: id },
      });
      await tx.announcementPlacement.deleteMany({
        where: { announcementId: id },
      });
      await tx.announcementPromotion.deleteMany({
        where: { announcementId: id },
      });

      await tx.announcementTranslation.createMany({
        data: input.translations.map(x => ({
          announcementId: id,
          locale: x.locale,
          title: x.title,
          message: x.message,
          actionLabel: x.actionLabel ?? null,
        })),
      });

      await tx.announcementPlacement.createMany({
        data: input.placements.map(x => ({
          announcementId: id,
          channel: x.channel,
          placementKey: x.placementKey,
          isEnabled: x.isEnabled,
        })),
      });

      if (input.promoCodeIds.length) {
        await tx.announcementPromotion.createMany({
          data: input.promoCodeIds.map(promoCodeId => ({
            announcementId: id,
            promoCodeId,
          })),
        });
      }
    });

    return this.findOne(id);
  }

  async publish(id: string) {
    const item = await this.findOne(id);

    if (
      item.status !== 'DRAFT' &&
      item.status !== 'PAUSED' &&
      item.status !== 'SCHEDULED'
    ) {
      throw new ConflictException(
        'Announcement cannot be published in this state.',
      );
    }

    // Only validated, active version-1 audience segments
    // may be published. Runtime delivery will evaluate
    // the actual include/exclude conditions fail-closed.
    if (item.targets.length > 0) {
      const linkedTargets =
        await this.prisma.announcementTarget.findMany({
          where: { announcementId: id },
          include: {
            segment: {
              select: {
                isActive: true,
                rulesVersion: true,
                rulesJson: true,
              },
            },
          },
        });

      // If a target was removed between the initial read
      // and validation, do not publish against stale data.
      if (linkedTargets.length !== item.targets.length) {
        throw new ConflictException(
          'Announcement targeting changed. Please retry.',
        );
      }

      for (const target of linkedTargets) {
        const validated = audienceRulesSchema.safeParse(
          target.segment.rulesJson,
        );

        if (
          !target.segment.isActive ||
          target.segment.rulesVersion !== 1 ||
          !validated.success
        ) {
          throw new BadRequestException(
            'Announcement has an inactive or unsupported audience segment.',
          );
        }
      }
    }

    if (!item.translations.length ||
        !item.placements.some(x => x.isEnabled)) {
      throw new BadRequestException(
        'At least one translation and active placement are required.',
      );
    }

    const now = new Date();

    if (item.endsAt && item.endsAt <= now) {
      throw new BadRequestException(
        'Announcement has already expired.',
      );
    }

    if (item.imageAssetId) {
      const image = await this.prisma.mediaAsset.findUnique({
        where: { id: item.imageAssetId },
      });

      if (
        !image ||
        image.type !== 'IMAGE' ||
        image.visibility !== 'PUBLIC' ||
        image.status !== 'READY'
      ) {
        throw new BadRequestException(
          'Announcement image is not available.',
        );
      }
    }

    if (item.kind === 'PROMOTION' && !item.promotions.length) {
      throw new BadRequestException(
        'Promotion link is required.',
      );
    }

    if (item.promotions.length) {
      const ids = item.promotions.map(x => x.promoCodeId);

      const available = await this.prisma.promoCode.count({
        where: {
          id: { in: ids },
          isActive: true,
          AND: [
            {
              OR: [
                { validFrom: null },
                { validFrom: { lte: now } },
              ],
            },
            {
              OR: [
                { validUntil: null },
                { validUntil: { gt: now } },
              ],
            },
          ],
        },
      });

      if (available !== ids.length) {
        throw new BadRequestException(
          'A linked promotion is inactive, not started, or expired.',
        );
      }

      const promos = await this.prisma.promoCode.findMany({
        where: { id: { in: ids } },
        select: { maxUses: true, currentUses: true },
      });
      if (
        promos.some(
          (promo) =>
            promo.maxUses !== null &&
            promo.currentUses >= promo.maxUses,
        )
      ) {
        throw new BadRequestException(
          'A linked promotion has reached its usage limit.',
        );
      }
    }

    const status =
      item.startsAt && item.startsAt > now
        ? 'SCHEDULED'
        : 'PUBLISHED';

    const updated = await this.prisma.announcement.updateMany({
      where: {
        id,
        status: { in: ['DRAFT', 'PAUSED', 'SCHEDULED'] },
      },
      data: { status },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'Announcement state changed.',
      );
    }

    return this.findOne(id);
  }

  async pause(id: string) {
    const updated = await this.prisma.announcement.updateMany({
      where: {
        id,
        status: { in: ['PUBLISHED', 'SCHEDULED'] },
      },
      data: { status: 'PAUSED' },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'Only published or scheduled announcements can be paused.',
      );
    }

    return this.findOne(id);
  }

  async archive(id: string) {
    const item = await this.findOne(id);

    if (item.status === 'ARCHIVED') {
      return item;
    }

    await this.prisma.announcement.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return this.findOne(id);
  }
}
