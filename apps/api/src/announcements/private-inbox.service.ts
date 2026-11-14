import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AdvancedTargetingService } from './advanced-targeting.service.js';
import { DeliveryPolicyService } from '../notifications/delivery-policy.service.js';

export type PrivateInboxQuery = { appId?: string; platform?: 'WEB' | 'ANDROID' | 'IOS'; locale?: string; page?: number; limit?: number };

@Injectable()
export class PrivateInboxService {
  constructor(private readonly db: PrismaService, private readonly targeting: AdvancedTargetingService,
    private readonly policy: DeliveryPolicyService) {}

  private async visible(userId: string, query: PrivateInboxQuery) {
    const context = await this.targeting.forLearner(userId, query.appId, query.platform);
    if (!context) return [];
    const now = new Date();
    // Limit and order in DB, NOT user-provided free-form order.
    const rows = await this.db.announcement.findMany({
      where: { status: { in: ['PUBLISHED', 'SCHEDULED'] },
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
        placements: { some: { channel: 'NOTIFICATION_BELL', isEnabled: true } },
      },
      include: { translations: true, promotions: { include: { promoCode: true } },
        targets: { include: { segment: true } }, userNotifications: { where: { userId } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], take: 500,
    });
    const out = [];
    for (const item of rows) {
      if (!this.targeting.matchesTargets(item.targets, context)) continue;
      if (item.purpose === 'MARKETING') {
        // Inbox marketing requires explicit in-app marketing consent.
        const allowed = await this.policy.evaluate(userId, 'NOTIFICATION_BELL', 'MARKETING');
        if (!allowed.allowed) continue;
      }
      if (item.kind === 'PROMOTION' && item.promotions.length === 0) continue;
      if (item.promotions.some(p => !p.promoCode.isActive ||
        (p.promoCode.validFrom && p.promoCode.validFrom > now) ||
        (p.promoCode.validUntil && p.promoCode.validUntil <= now) ||
        (p.promoCode.maxUses !== null && p.promoCode.currentUses >= p.promoCode.maxUses))) continue;
      const state = item.userNotifications[0];
      if (state?.dismissedAt) continue;
      const locale = (query.locale || 'en').toLowerCase();
      const translation = item.translations.find(t => t.locale.toLowerCase() === locale) ||
        item.translations.find(t => t.locale.toLowerCase() === locale.split('-')[0]) ||
        item.translations.find(t => t.locale.toLowerCase() === 'en') || item.translations[0];
      if (!translation) continue;
      out.push({ id: item.id, title: translation.title, message: translation.message,
        locale: translation.locale, kind: item.kind, purpose: item.purpose, createdAt: item.createdAt,
        actionType: item.actionType, actionValue: item.actionValue,
        isRead: Boolean(state?.readAt), readAt: state?.readAt ?? null, isDismissible: item.isDismissible });
    }
    return out;
  }

  async list(userId: string, query: PrivateInboxQuery) {
    const items = await this.visible(userId, query);
    const page = Math.min(Math.max(query.page ?? 1, 1), 10);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    return { data: items.slice((page - 1) * limit, page * limit), unreadCount: items.filter(x => !x.isRead).length,
      pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) },
      boundedTo: 500 };
  }
  async unreadCount(userId: string, query: PrivateInboxQuery) {
    const items = await this.visible(userId, query);
    return { unreadCount: items.filter(x => !x.isRead).length, boundedTo: 500 };
  }
  async markRead(userId: string, id: string, query: PrivateInboxQuery) {
    if (!(await this.visible(userId, query)).some(x => x.id === id)) throw new NotFoundException();
    const now = new Date();
    await this.db.userNotification.upsert({ where: { userId_announcementId: { userId, announcementId: id } },
      create: { userId, announcementId: id, readAt: now }, update: {} });
    await this.db.userNotification.updateMany({ where: { userId, announcementId: id, readAt: null, dismissedAt: null }, data: { readAt: now } });
    return { success: true };
  }
  async dismiss(userId: string, id: string, query: PrivateInboxQuery) {
    const item = (await this.visible(userId, query)).find(x => x.id === id);
    if (!item) throw new NotFoundException();
    if (!item.isDismissible) throw new BadRequestException('Not dismissible');
    const now = new Date();
    await this.db.userNotification.upsert({ where: { userId_announcementId: { userId, announcementId: id } },
      create: { userId, announcementId: id, dismissedAt: now }, update: {} });
    await this.db.userNotification.updateMany({ where: { userId, announcementId: id, dismissedAt: null }, data: { dismissedAt: now } });
    return { success: true };
  }
}
