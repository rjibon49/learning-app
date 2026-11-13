
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import {
  matchesAnnouncementTargets,
} from './audience-evaluator.js';

import type {
  AnnouncementContext,
} from './audience-evaluator.js';

import type {
  NotificationInboxQuery,
} from './notification-inbox.schemas.js';

@Injectable()
export class NotificationInboxService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Initial version uses a bounded candidate set.
  // Expand to cursor-based scanning before large-scale launch.
  private readonly candidateLimit = 200;

  private async context(query: NotificationInboxQuery):
    Promise<AnnouncementContext | null> {
    if (!query.appId) {
      return { platform: query.platform };
    }

    const app = await this.prisma.app.findUnique({
      where: { id: query.appId },
      select: {
        id: true,
        isActive: true,
        languageId: true,
        levelId: true,
      },
    });

    if (!app?.isActive) return null;

    return {
      appId: app.id,
      languageId: app.languageId,
      levelId: app.levelId ?? undefined,
      platform: query.platform,
    };
  }

  private promotionValid(
    item: {
      isActive: boolean;
      validFrom: Date | null;
      validUntil: Date | null;
      currentUses: number;
      maxUses: number | null;
    },
    now: Date,
  ): boolean {
    return item.isActive &&
      (!item.validFrom || item.validFrom <= now) &&
      (!item.validUntil || item.validUntil > now) &&
      (item.maxUses === null ||
        item.currentUses < item.maxUses);
  }

  private async eligible(
    query: NotificationInboxQuery,
  ) {
    const context = await this.context(query);

    if (!context) return [];

    const now = new Date();

    const candidates =
      await this.prisma.announcement.findMany({
        where: {
          status: {
            in: ['PUBLISHED', 'SCHEDULED'],
          },

          AND: [
            {
              OR: [
                { startsAt: null },
                { startsAt: { lte: now } },
              ],
            },
            {
              OR: [
                { endsAt: null },
                { endsAt: { gt: now } },
              ],
            },
          ],

          placements: {
            some: {
              channel: 'NOTIFICATION_BELL',
              isEnabled: true,
            },
          },
        },

        include: {
          translations: true,

          placements: {
            where: {
              channel: 'NOTIFICATION_BELL',
              isEnabled: true,
            },
          },

          imageAsset: {
            select: {
              type: true,
              visibility: true,
              status: true,
              publicUrl: true,
            },
          },

          targets: {
            include: { segment: true },
          },

          promotions: {
            include: { promoCode: true },
          },
        },

        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],

        take: this.candidateLimit,
      });

    return candidates.filter((item) => {
      if (item.placements.length === 0) return false;

      // This first release treats the inbox as an
      // in-app announcement feed, not a private
      // transactional message or push queue.
      if (item.purpose !== 'MARKETING' &&
          item.purpose !== 'SYSTEM') {
        return false;
      }

      if (
        !matchesAnnouncementTargets(
          item.targets,
          context,
        )
      ) {
        return false;
      }

      if (
        item.kind === 'PROMOTION' &&
        item.promotions.length === 0
      ) {
        return false;
      }

      if (
        !item.promotions.every(({ promoCode }) =>
          this.promotionValid(promoCode, now),
        )
      ) {
        return false;
      }

      if (item.imageAsset) {
        const image = item.imageAsset;

        if (
          image.type !== 'IMAGE' ||
          image.visibility !== 'PUBLIC' ||
          image.status !== 'READY' ||
          !image.publicUrl?.startsWith('https://')
        ) {
          return false;
        }
      }

      return true;
    });
  }

  private translate(
    translations: Array<{
      locale: string;
      title: string;
      message: string;
      actionLabel: string | null;
    }>,
    locale: string,
  ) {
    const requested = locale.toLowerCase();
    const language = requested.split('-')[0];

    return (
      translations.find(
        (item) => item.locale.toLowerCase() === requested,
      ) ??
      translations.find(
        (item) => item.locale.toLowerCase() === language,
      ) ??
      translations.find(
        (item) => item.locale.toLowerCase() === 'en',
      ) ??
      translations[0] ??
      null
    );
  }

  private async visible(
    userId: string,
    query: NotificationInboxQuery,
  ) {
    const eligible = await this.eligible(query);

    if (!eligible.length) return [];

    const states = await this.prisma.userNotification.findMany({
      where: {
        userId,
        announcementId: {
          in: eligible.map((item) => item.id),
        },
      },
      select: {
        announcementId: true,
        readAt: true,
        dismissedAt: true,
      },
    });

    const byId = new Map(
      states.map((state) => [
        state.announcementId,
        state,
      ]),
    );

    return eligible.flatMap((item) => {
      const state = byId.get(item.id);

      if (state?.dismissedAt) return [];

      const translation = this.translate(
        item.translations,
        query.locale,
      );

      if (!translation) return [];

      return [{
        id: item.id,
        slug: item.slug,
        kind: item.kind,
        purpose: item.purpose,
        priority: item.priority,

        title: translation.title,
        message: translation.message,
        locale: translation.locale,
        actionLabel: translation.actionLabel,

        actionType: item.actionType,
        actionValue: item.actionValue,

        imageUrl: item.imageAsset?.publicUrl ?? null,

        promotionCodes: item.promotions.map(
          ({ promoCode }) => promoCode.code,
        ),

        createdAt: item.createdAt,
        readAt: state?.readAt ?? null,
        isRead: Boolean(state?.readAt),
        isDismissible: item.isDismissible,
      }];
    });
  }

  async list(
    userId: string,
    query: NotificationInboxQuery,
  ) {
    const visible = await this.visible(userId, query);

    const start = (query.page - 1) * query.limit;
    const end = start + query.limit;

    return {
      data: visible.slice(start, end),
      unreadCount: visible.filter(
        (item) => !item.isRead,
      ).length,

      pagination: {
        page: query.page,
        limit: query.limit,
        total: visible.length,
        totalPages: Math.ceil(
          visible.length / query.limit,
        ),
      },

      candidateLimit: this.candidateLimit,
    };
  }

  async unreadCount(
    userId: string,
    query: NotificationInboxQuery,
  ) {
    const visible = await this.visible(userId, query);

    return {
      unreadCount: visible.filter(
        (item) => !item.isRead,
      ).length,
    };
  }

  private async requireVisible(
    userId: string,
    announcementId: string,
    query: NotificationInboxQuery,
  ) {
    const visible = await this.visible(userId, query);

    const item = visible.find(
      (entry) => entry.id === announcementId,
    );

    if (!item) {
      throw new NotFoundException(
        'Notification not found.',
      );
    }

    return item;
  }

  async markRead(
    userId: string,
    announcementId: string,
    query: NotificationInboxQuery,
  ) {
    await this.requireVisible(
      userId,
      announcementId,
      query,
    );

    const now = new Date();

    // Idempotent: already read notifications
    // retain their original read timestamp.
    await this.prisma.userNotification.upsert({
      where: {
        userId_announcementId: {
          userId,
          announcementId,
        },
      },
      create: {
        userId,
        announcementId,
        readAt: now,
      },
      update: {},
    });

    await this.prisma.userNotification.updateMany({
      where: {
        userId,
        announcementId,
        readAt: null,
        dismissedAt: null,
      },
      data: { readAt: now },
    });

    return { success: true };
  }

  async dismiss(
    userId: string,
    announcementId: string,
    query: NotificationInboxQuery,
  ) {
    const item = await this.requireVisible(
      userId,
      announcementId,
      query,
    );

    if (!item.isDismissible) {
      throw new BadRequestException(
        'This notification cannot be dismissed.',
      );
    }

    const now = new Date();

    await this.prisma.userNotification.upsert({
      where: {
        userId_announcementId: {
          userId,
          announcementId,
        },
      },
      create: {
        userId,
        announcementId,
        dismissedAt: now,
      },
      update: {},
    });

    await this.prisma.userNotification.updateMany({
      where: {
        userId,
        announcementId,
        dismissedAt: null,
      },
      data: { dismissedAt: now },
    });

    return { success: true };
  }
}
