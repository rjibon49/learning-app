
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  MarketingPreferencesInput,
} from './marketing-preferences.schemas.js';

type MarketingChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';

const CHANNELS: MarketingChannel[] = [
  'EMAIL',
  'WHATSAPP',
  'SMS',
];

@Injectable()
export class MarketingPreferencesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // READ CURRENT PREFERENCES
  // ==========================================

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        phoneNumber: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const records =
      await this.prisma.marketingConsent.findMany({
        where: {
          userId,
          purpose: 'MARKETING',
          channel: { in: CHANNELS },
        },
        orderBy: [
          { recordedAt: 'desc' },
          { id: 'desc' },
        ],
        select: {
          channel: true,
          granted: true,
          recordedAt: true,
        },
      });

    const latest = new Map<
      MarketingChannel,
      boolean
    >();

    for (const record of records) {
      const channel =
        record.channel as MarketingChannel;

      if (!latest.has(channel)) {
        latest.set(channel, record.granted);
      }
    }

    return {
      email: latest.get('EMAIL') ?? false,
      whatsapp: latest.get('WHATSAPP') ?? false,
      sms: latest.get('SMS') ?? false,

      contact: {
        hasEmail: Boolean(user.email),
        emailVerified: Boolean(user.emailVerifiedAt),
        hasPhone: Boolean(user.phoneNumber),
        phoneVerified: false,
      },

      // Explicit consent does not imply
      // provider readiness or verified phone.
      whatsappDeliveryAvailable: false,
      smsDeliveryAvailable: false,
    };
  }

  // ==========================================
  // UPDATE PREFERENCES
  // ==========================================

  async updatePreferences(
    userId: string,
    input: MarketingPreferencesInput,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (input.email && !user.emailVerifiedAt) {
      throw new BadRequestException(
        'Email verification is required for email marketing.',
      );
    }

    const current = await this.getPreferences(userId);

    const changes = CHANNELS.map((channel) => {
      const key = channel.toLowerCase() as
        keyof MarketingPreferencesInput;

      return {
        channel,
        granted: input[key],
        previous: current[key],
      };
    }).filter((item) => item.granted !== item.previous);

    if (changes.length === 0) {
      return current;
    }

    const granting = changes.some((item) => item.granted);

    const policy = granting
      ? await this.prisma.consentPolicy.findFirst({
          where: {
            isActive: true,
            OR: [
              { effectiveAt: null },
              { effectiveAt: { lte: new Date() } },
            ],
          },
          orderBy: [
            { effectiveAt: 'desc' },
            { createdAt: 'desc' },
          ],
          select: {
            id: true,
            version: true,
          },
        })
      : null;

    if (granting && !policy) {
      throw new BadRequestException(
        'Marketing policy is not configured. You can still opt out.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.marketingConsent.createMany({
        data: changes.map((item) => ({
          userId,
          channel: item.channel,
          purpose: 'MARKETING' as const,
          granted: item.granted,
          source: 'USER_PREFERENCES',
          policyId: policy?.id ?? null,
          policyVersion:
            policy?.version ?? 'withdrawal',
        })),
      });

      // Preferences are separate from consent.
      // The effective send decision must
      // check BOTH of them.
      for (const item of changes) {
        await tx.notificationPreference.upsert({
          where: {
            userId_channel_purpose: {
              userId,
              channel: item.channel,
              purpose: 'MARKETING',
            },
          },
          create: {
            userId,
            channel: item.channel,
            purpose: 'MARKETING',
            enabled: item.granted,
          },
          update: {
            enabled: item.granted,
          },
        });
      }
    });

    return this.getPreferences(userId);
  }

  // ==========================================
  // OPT OUT OF ALL MARKETING
  // ==========================================

  async unsubscribeAll(userId: string) {
    return this.updatePreferences(userId, {
      email: false,
      whatsapp: false,
      sms: false,
    });
  }
}
