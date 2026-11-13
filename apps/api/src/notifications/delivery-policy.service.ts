
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  NotificationChannel,
  NotificationPurpose,
} from '../generated/prisma/client.js';

// ==========================================
// DELIVERY ELIGIBILITY RESULT
// ==========================================

export type Eligibility =
  | {
      allowed: true;
      address: string;
    }
  | {
      allowed: false;
      reason: string;
    };

@Injectable()
export class DeliveryPolicyService {
  constructor(
    private readonly db: PrismaService,
  ) {}

  // ==========================================
  // USER DELIVERY ELIGIBILITY
  // ==========================================

  async evaluate(
    userId: string | null,
    channel: NotificationChannel,
    purpose: NotificationPurpose,
  ): Promise<Eligibility> {
    // ----------------------------------------
    // 1. User must exist
    // ----------------------------------------

    if (!userId) {
      return {
        allowed: false,
        reason: 'MISSING_USER',
      };
    }

    const user = await this.db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
        email: true,
        emailVerifiedAt: true,
        phoneNumber: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      user.role !== 'USER'
    ) {
      return {
        allowed: false,
        reason: 'USER_UNAVAILABLE',
      };
    }

    // ----------------------------------------
    // 2. Determine verified delivery address
    // ----------------------------------------

    let address: string | null = null;

    switch (channel) {
      case 'EMAIL': {
        if (
          user.email &&
          user.emailVerifiedAt
        ) {
          address = user.email;
        }

        break;
      }

      case 'NOTIFICATION_BELL':
      case 'IN_APP': {
        // Internal authenticated notifications.
        address = user.id;
        break;
      }

      case 'WHATSAPP':
      case 'SMS': {
        // Phone is optional.
        //
        // No phone OTP or other phone ownership
        // verification is implemented yet.
        //
        // Never infer verified phone ownership
        // merely from a stored phone number.
        return {
          allowed: false,
          reason: 'PHONE_CHANNEL_NOT_VERIFIED',
        };
      }

      case 'MOBILE_PUSH':
      case 'WEB_PUSH': {
        // Push delivery requires an active,
        // validated device subscription/token.
        //
        // That check belongs to the dedicated
        // push-device delivery adapter.
        return {
          allowed: false,
          reason: 'PUSH_DEVICE_VERIFICATION_REQUIRED',
        };
      }

      case 'WEBSITE_BANNER': {
        // Public website banners use the public
        // announcement delivery endpoint.
        return {
          allowed: false,
          reason: 'USE_PUBLIC_ANNOUNCEMENT_DELIVERY',
        };
      }

      default: {
        return {
          allowed: false,
          reason: 'UNSUPPORTED_NOTIFICATION_CHANNEL',
        };
      }
    }

    if (!address) {
      return {
        allowed: false,
        reason: 'CHANNEL_ADDRESS_UNVERIFIED_OR_UNSUPPORTED',
      };
    }

    // ----------------------------------------
    // 3. Notification preference
    // ----------------------------------------

    const preference =
      await this.db.notificationPreference.findUnique({
        where: {
          userId_channel_purpose: {
            userId,
            channel,
            purpose,
          },
        },
        select: {
          enabled: true,
        },
      });

    // Explicitly disabled notifications must
    // never be sent.
    if (preference?.enabled === false) {
      return {
        allowed: false,
        reason: 'NOTIFICATION_DISABLED',
      };
    }

    // ----------------------------------------
    // 4. Marketing consent
    // ----------------------------------------

    if (purpose === 'MARKETING') {
      const latestConsent =
        await this.db.marketingConsent.findFirst({
          where: {
            userId,
            channel,
            purpose: 'MARKETING',
          },
          orderBy: [
            {
              recordedAt: 'desc',
            },
            {
              id: 'desc',
            },
          ],
          select: {
            granted: true,
          },
        });

      // No explicit opt-in = no marketing.
      if (!latestConsent?.granted) {
        return {
          allowed: false,
          reason: 'MARKETING_CONSENT_MISSING',
        };
      }

      // Marketing requires both explicit
      // consent and an enabled preference.
      //
      // A missing preference does not imply
      // permission to send marketing content.
      if (preference?.enabled !== true) {
        return {
          allowed: false,
          reason: 'MARKETING_PREFERENCE_MISSING',
        };
      }
    }

    // ----------------------------------------
    // 5. Eligible
    // ----------------------------------------

    return {
      allowed: true,
      address,
    };
  }
}
