
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import {
  matchesAnnouncementTargets,
} from './audience-evaluator.js';

import type {
  AnnouncementContext,
} from './audience-evaluator.js';

import type {
  PublicAnnouncementQuery,
} from './announcement-delivery.schemas.js';

@Injectable()
export class AnnouncementDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async resolveContext(
    query: PublicAnnouncementQuery,
  ): Promise<AnnouncementContext | null> {
    // Mobile app identity is derived from the DB
    // rather than accepting arbitrary language/level
    // associations supplied by the client.
    if (query.appId) {
      const app = await this.prisma.app.findUnique({
        where: { id: query.appId },
        select: {
          id: true,
          isActive: true,
          languageId: true,
          levelId: true,
        },
      });

      if (!app?.isActive) {
        return null;
      }

      if (
        query.languageId &&
        query.languageId !== app.languageId
      ) {
        return null;
      }

      if (
        query.levelId &&
        query.levelId !== app.levelId
      ) {
        return null;
      }

      return {
        appId: app.id,
        languageId: app.languageId,
        levelId: app.levelId ?? undefined,
        platform: query.platform,
      };
    }

    // Website filters are public presentation
    // context, never an authenticated identity.
    if (query.languageId) {
      const language =
        await this.prisma.language.findUnique({
          where: { id: query.languageId },
          select: { isActive: true },
        });

      if (!language?.isActive) {
        return null;
      }
    }

    if (query.levelId) {
      const level =
        await this.prisma.proficiencyLevel.findUnique({
          where: { id: query.levelId },
          select: { id: true },
        });

      if (!level) {
        return null;
      }
    }

    return {
      languageId: query.languageId,
      levelId: query.levelId,
      platform: query.platform,
    };
  }

  private isPromotionEligible(
    promotions: Array<{
      promoCode: {
        isActive: boolean;
        validFrom: Date | null;
        validUntil: Date | null;
        maxUses: number | null;
        currentUses: number;
      };
    }>,
    now: Date,
  ): boolean {
    return promotions.every(({ promoCode }) => {
      if (!promoCode.isActive) return false;

      if (
        promoCode.validFrom &&
        promoCode.validFrom > now
      ) {
        return false;
      }

      if (
        promoCode.validUntil &&
        promoCode.validUntil <= now
      ) {
        return false;
      }

      if (
        promoCode.maxUses !== null &&
        promoCode.currentUses >= promoCode.maxUses
      ) {
        return false;
      }

      return true;
    });
  }

  async deliver(query: PublicAnnouncementQuery) {
    const context = await this.resolveContext(query);

    if (!context) {
      return { data: [] };
    }

    const now = new Date();

    const announcements =
      await this.prisma.announcement.findMany({
        where: {
          status: {
            in: ['PUBLISHED', 'SCHEDULED'],
          },
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } },
          ],
          AND: [
            {
              OR: [
                { endsAt: null },
                { endsAt: { gt: now } },
              ],
            },
          ],
          placements: {
            some: {
              channel: query.channel,
              placementKey: query.placementKey,
              isEnabled: true,
            },
          },
        },
        select: {
          id: true,
          slug: true,
          kind: true,
          purpose: true,
          priority: true,
          isDismissible: true,
          actionType: true,
          actionValue: true,
          imageAsset: {
            select: {
              type: true,
              visibility: true,
              status: true,
              publicUrl: true,
            },
          },
          translations: {
            select: {
              locale: true,
              title: true,
              message: true,
              actionLabel: true,
            },
          },
          targets: {
            select: {
              exclude: true,
              segment: {
                select: {
                  isActive: true,
                  rulesVersion: true,
                  rulesJson: true,
                },
              },
            },
          },
          promotions: {
            select: {
              promoCode: {
                select: {
                  code: true,
                  isActive: true,
                  validFrom: true,
                  validUntil: true,
                  maxUses: true,
                  currentUses: true,
                },
              },
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 100,
      });

    const results = [];

    for (const item of announcements) {
      if (
        !matchesAnnouncementTargets(
          item.targets,
          context,
        )
      ) {
        continue;
      }

      // A promotional announcement must
      // have a valid linked promotion.
      if (
        item.kind === 'PROMOTION' &&
        item.promotions.length === 0
      ) {
        continue;
      }

      if (
        !this.isPromotionEligible(
          item.promotions,
          now,
        )
      ) {
        continue;
      }

      // Missing or private images must not
      // become publicly accessible.
      if (
        item.imageAsset &&
        (
          item.imageAsset.type !== 'IMAGE' ||
          item.imageAsset.visibility !== 'PUBLIC' ||
          item.imageAsset.status !== 'READY' ||
          !item.imageAsset.publicUrl?.startsWith('https://')
        )
      ) {
        continue;
      }

      // The image relation can be null when a
      // referenced media asset was deleted.
      // This is allowed for text-only announcements.

      const requestedLocale =
        query.locale.toLowerCase();

      const translation =
        item.translations.find(
          (t) =>
            t.locale.toLowerCase() === requestedLocale,
        ) ??
        item.translations.find(
          (t) =>
            t.locale.toLowerCase() ===
            requestedLocale.split('-')[0],
        ) ??
        item.translations.find(
          (t) => t.locale.toLowerCase() === 'en',
        ) ??
        item.translations[0];

      if (!translation) {
        continue;
      }

      results.push({
        id: item.id,
        slug: item.slug,
        kind: item.kind,
        purpose: item.purpose,
        priority: item.priority,
        isDismissible: item.isDismissible,

        title: translation.title,
        message: translation.message,
        locale: translation.locale,
        actionLabel: translation.actionLabel,
        actionType: item.actionType,
        actionValue: item.actionValue,

        imageUrl: item.imageAsset?.publicUrl ?? null,

        promotionCodes: item.promotions.map(
          (p) => p.promoCode.code,
        ),
      });

      if (results.length >= 20) {
        break;
      }
    }

    return { data: results };
  }
}
