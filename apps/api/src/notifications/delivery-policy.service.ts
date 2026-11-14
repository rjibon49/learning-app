import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { NotificationChannel, NotificationPurpose } from '../generated/prisma/client.js';

export type Eligibility = { allowed: true; address: string } | { allowed: false; reason: string };

/** Fail closed. Marketing requires both an affirmative consent AND an enabled preference. */
@Injectable()
export class DeliveryPolicyService {
  constructor(private readonly db: PrismaService) {}

  async evaluate(userId: string | null, channel: NotificationChannel, purpose: NotificationPurpose): Promise<Eligibility> {
    if (!userId) return { allowed: false, reason: 'MISSING_USER' };
    const user = await this.db.user.findUnique({ where: { id: userId }, select: {
      id: true, email: true, emailVerifiedAt: true, phoneNumber: true, isActive: true, role: true,
    }});
    if (!user || user.role !== 'USER' || !user.isActive) return { allowed: false, reason: 'USER_UNAVAILABLE' };
    let address: string | null = null;
    if (channel === 'EMAIL' && user.email && user.emailVerifiedAt) address = user.email;
    if (channel === 'IN_APP' || channel === 'NOTIFICATION_BELL') address = user.id;
    // Phone collection never establishes ownership. No SMS/WhatsApp until verified enrollment.
    if (channel === 'WHATSAPP' || channel === 'SMS') return { allowed: false, reason: 'PHONE_CHANNEL_DISABLED_UNVERIFIED' };
    if (channel === 'MOBILE_PUSH' || channel === 'WEB_PUSH') return { allowed: false, reason: 'VERIFIED_PUSH_SUBSCRIPTION_REQUIRED' };
    if (channel === 'WEBSITE_BANNER') return { allowed: false, reason: 'USE_PUBLIC_DELIVERY' };
    if (!address) return { allowed: false, reason: 'ADDRESS_UNVERIFIED' };

    const pref = await this.db.notificationPreference.findUnique({
      where: { userId_channel_purpose: { userId, channel, purpose } }, select: { enabled: true },
    });
    if (pref?.enabled === false) return { allowed: false, reason: 'USER_DISABLED_CHANNEL' };
    if (purpose === 'MARKETING') {
      const consent = await this.db.marketingConsent.findFirst({
        where: { userId, channel, purpose: 'MARKETING' },
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }], select: { granted: true },
      });
      if (!consent?.granted) return { allowed: false, reason: 'MARKETING_CONSENT_NOT_GRANTED' };
      if (pref?.enabled !== true) return { allowed: false, reason: 'MARKETING_PREFERENCE_MISSING' };
    }
    return { allowed: true, address };
  }
}
