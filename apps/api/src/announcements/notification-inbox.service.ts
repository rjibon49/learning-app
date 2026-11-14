import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AdvancedTargetingService } from './advanced-targeting.service.js';
import { DeliveryPolicyService } from '../notifications/delivery-policy.service.js';
import type { NotificationInboxQuery } from './notification-inbox.schemas.js';

@Injectable()
export class NotificationInboxService {
  constructor(
    private readonly db: PrismaService,
    private readonly targeting: AdvancedTargetingService,
    private readonly policy: DeliveryPolicyService,
  ) {}
  // Explicitly bounded: results are not an unlimited historical inbox.
  private readonly candidateLimit = 500;

  private async visible(userId: string, query: NotificationInboxQuery) {
    const context = await this.targeting.forLearner(userId, query.appId, query.platform);
    if (!context) return [];
    const now = new Date();
    const rows = await this.db.announcement.findMany({
      where: {
        status: { in: ['PUBLISHED', 'SCHEDULED'] },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
        placements: { some: { channel: 'NOTIFICATION_BELL', isEnabled: true } },
      },
      include: {
        translations: true,
        promotions: { include: { promoCode: true } },
        targets: { include: { segment: true } },
        userNotifications: { where: { userId } },
        imageAsset: { select: { type: true, visibility: true, status: true, publicUrl: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: this.candidateLimit,
    });
    // Cache eligibility within one request: no repeated DB lookups per announcement.
    let marketingAllowed: boolean | null = null;
    const output: Array<{
      id: string; slug: string; title: string; message: string; locale: string;
      kind: string; purpose: string; createdAt: Date; readAt: Date | null;
      isRead: boolean; isDismissible: boolean; actionType: string | null;
      actionValue: string | null; imageUrl: string | null;
    }> = [];
    for (const row of rows) {
      // Dedicated private transactional sends must NOT be inferred from a global announcement.
      if (row.purpose !== 'MARKETING' && row.purpose !== 'SYSTEM') continue;
      if (!this.targeting.matchesTargets(row.targets, context)) continue;
      if (row.purpose === 'MARKETING') {
        if (marketingAllowed === null) {
          marketingAllowed = (await this.policy.evaluate(userId, 'NOTIFICATION_BELL', 'MARKETING')).allowed;
        }
        if (!marketingAllowed) continue;
      }
      if (row.kind === 'PROMOTION' && !row.promotions.length) continue;
      if (row.promotions.some(({ promoCode: p }) => !p.isActive ||
        (p.validFrom && p.validFrom > now) || (p.validUntil && p.validUntil <= now) ||
        (p.maxUses !== null && p.currentUses >= p.maxUses))) continue;
      if (row.imageAsset && (row.imageAsset.type !== 'IMAGE' || row.imageAsset.status !== 'READY' ||
        row.imageAsset.visibility !== 'PUBLIC' || !row.imageAsset.publicUrl?.startsWith('https://'))) continue;
      const state = row.userNotifications[0];
      if (state?.dismissedAt) continue;
      const locale = query.locale.toLowerCase();
      const translation = row.translations.find(t => t.locale.toLowerCase() === locale) ??
        row.translations.find(t => t.locale.toLowerCase() === locale.split('-')[0]) ??
        row.translations.find(t => t.locale.toLowerCase() === 'en') ?? row.translations[0];
      if (!translation) continue;
      output.push({
        id: row.id, slug: row.slug, title: translation.title, message: translation.message,
        locale: translation.locale, kind: row.kind, purpose: row.purpose,
        createdAt: row.createdAt, readAt: state?.readAt ?? null, isRead: Boolean(state?.readAt),
        isDismissible: row.isDismissible, actionType: row.actionType,
        actionValue: row.actionValue, imageUrl: row.imageAsset?.publicUrl ?? null,
      });
    }
    return output;
  }

  async list(userId: string, query: NotificationInboxQuery) {
    const rows = await this.visible(userId, query);
    const start = (query.page - 1) * query.limit;
    return { data: rows.slice(start, start + query.limit),
      unreadCount: rows.filter(r => !r.isRead).length,
      pagination: { page: query.page, limit: query.limit, total: rows.length,
        totalPages: Math.ceil(rows.length / query.limit) }, boundedTo: this.candidateLimit };
  }
  async unreadCount(userId: string, query: NotificationInboxQuery) {
    const rows = await this.visible(userId, query);
    return { unreadCount: rows.filter(r => !r.isRead).length, boundedTo: this.candidateLimit };
  }
  async markRead(userId: string, id: string, query: NotificationInboxQuery) {
    if (!(await this.visible(userId, query)).some(row => row.id === id)) throw new NotFoundException('Notification not found');
    const now = new Date();
    await this.db.userNotification.upsert({
      where: { userId_announcementId: { userId, announcementId: id } },
      create: { userId, announcementId: id, readAt: now }, update: {},
    });
    await this.db.userNotification.updateMany({
      where: { userId, announcementId: id, readAt: null, dismissedAt: null }, data: { readAt: now },
    });
    return { success: true };
  }
  async dismiss(userId: string, id: string, query: NotificationInboxQuery) {
    const row = (await this.visible(userId, query)).find(x => x.id === id);
    if (!row) throw new NotFoundException('Notification not found');
    if (!row.isDismissible) throw new BadRequestException('Cannot dismiss this notification');
    const now = new Date();
    await this.db.userNotification.upsert({
      where: { userId_announcementId: { userId, announcementId: id } },
      create: { userId, announcementId: id, dismissedAt: now }, update: {},
    });
    await this.db.userNotification.updateMany({
      where: { userId, announcementId: id, dismissedAt: null }, data: { dismissedAt: now },
    });
    return { success: true };
  }
}
