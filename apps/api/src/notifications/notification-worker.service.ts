
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service.js';

type Eligibility =
  | { allowed: true }
  | { allowed: false; reason: string };

@Injectable()
export class NotificationWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    NotificationWorkerService.name,
  );

  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  private readonly intervalMs = 30_000;
  private readonly batchSize = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const enabled =
      this.config.get<string>(
        'NOTIFICATION_QUEUE_WORKER_ENABLED',
        'false',
      ) === 'true';

    if (!enabled) {
      this.logger.log(
        'Notification worker disabled by configuration.',
      );
      return;
    }

    this.logger.log(
      'Notification worker started in SAFE MODE.',
    );

    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);

    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  // ==========================================
  // SEND-TIME ELIGIBILITY
  // ==========================================

  private async checkEmailMarketing(
    userId: string,
  ): Promise<Eligibility> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isActive: true,
        email: true,
        emailVerifiedAt: true,
      },
    });

    if (
      !user ||
      user.role !== 'USER' ||
      !user.isActive ||
      !user.email ||
      !user.emailVerifiedAt
    ) {
      return {
        allowed: false,
        reason: 'RECIPIENT_UNAVAILABLE',
      };
    }

    const latestConsent =
      await this.prisma.marketingConsent.findFirst({
        where: {
          userId,
          channel: 'EMAIL',
          purpose: 'MARKETING',
        },
        orderBy: [
          { recordedAt: 'desc' },
          { id: 'desc' },
        ],
        select: {
          granted: true,
        },
      });

    if (!latestConsent?.granted) {
      return {
        allowed: false,
        reason: 'MARKETING_CONSENT_MISSING',
      };
    }

    const preference =
      await this.prisma.notificationPreference.findUnique({
        where: {
          userId_channel_purpose: {
            userId,
            channel: 'EMAIL',
            purpose: 'MARKETING',
          },
        },
        select: {
          enabled: true,
        },
      });

    if (preference?.enabled === false) {
      return {
        allowed: false,
        reason: 'MARKETING_OPTED_OUT',
      };
    }

    return { allowed: true };
  }

  // ==========================================
  // SAFE QUEUE INSPECTION
  // ==========================================

  private async inspectDueDelivery(
    id: string,
  ): Promise<'READY' | 'SKIPPED' | 'DEFERRED'> {
    const delivery =
      await this.prisma.notificationDelivery.findUnique({
        where: { id },
        include: {
          template: {
            select: {
              id: true,
              isActive: true,
              channel: true,
              purpose: true,
              providerConfigId: true,
              translations: {
                select: {
                  locale: true,
                },
              },
            },
          },
        },
      });

    if (!delivery || delivery.status !== 'QUEUED') {
      return 'DEFERRED';
    }

    const now = new Date();

    if (
      delivery.scheduledAt > now ||
      (delivery.nextRetryAt &&
        delivery.nextRetryAt > now)
    ) {
      return 'DEFERRED';
    }

    // Other channels remain untouched until
    // their separate delivery adapters exist.
    if (
      delivery.channel !== 'EMAIL' ||
      delivery.purpose !== 'MARKETING'
    ) {
      return 'DEFERRED';
    }

    const template = delivery.template;

    if (
      !template ||
      !template.isActive ||
      template.channel !== 'EMAIL' ||
      template.purpose !== 'MARKETING' ||
      !template.translations.length
    ) {
      await this.skip(
        id,
        'TEMPLATE_UNAVAILABLE',
      );
      return 'SKIPPED';
    }

    if (!delivery.userId) {
      await this.skip(
        id,
        'RECIPIENT_UNAVAILABLE',
      );
      return 'SKIPPED';
    }

    // Re-check consent immediately before
    // any future delivery adapter is called.
    const eligibility =
      await this.checkEmailMarketing(
        delivery.userId,
      );

    if (!eligibility.allowed) {
      await this.skip(
        id,
        eligibility.reason,
      );
      return 'SKIPPED';
    }

    // Provider readiness is checked separately.
    // A missing/disabled provider is not an
    // irreversible recipient failure.
    if (!template.providerConfigId) {
      return 'DEFERRED';
    }

    const provider =
      await this.prisma.notificationProviderConfig.findUnique({
        where: {
          id: template.providerConfigId,
        },
        select: {
          channel: true,
          providerKey: true,
          isEnabled: true,
          isTestMode: true,
        },
      });

    if (
      !provider ||
      provider.channel !== 'EMAIL' ||
      provider.providerKey !== 'smtp' ||
      !provider.isEnabled
    ) {
      return 'DEFERRED';
    }

    // No mail is sent in this phase,
    // including when a provider is enabled.
    return 'READY';
  }

  private async skip(
    id: string,
    reason: string,
  ): Promise<void> {
    const result =
      await this.prisma.notificationDelivery.updateMany({
        where: {
          id,
          status: 'QUEUED',
        },
        data: {
          status: 'SKIPPED',
          errorCode: reason,
          errorMessage:
            'Delivery blocked by safety validation.',
          nextRetryAt: null,
        },
      });

    if (result.count === 1) {
      this.logger.log(
        `Delivery ${id} skipped: ${reason}`,
      );
    }
  }

  // ==========================================
  // WORKER LOOP
  // ==========================================

  private async tick(): Promise<void> {
    if (this.running) return;

    this.running = true;

    try {
      const now = new Date();

      const due =
        await this.prisma.notificationDelivery.findMany({
          where: {
            status: 'QUEUED',
            channel: 'EMAIL',
            purpose: 'MARKETING',
            scheduledAt: {
              lte: now,
            },
            OR: [
              { nextRetryAt: null },
              { nextRetryAt: { lte: now } },
            ],
          },
          select: {
            id: true,
          },
          orderBy: [
            { scheduledAt: 'asc' },
            { createdAt: 'asc' },
          ],
          take: this.batchSize,
        });

      let ready = 0;
      let skipped = 0;

      for (const item of due) {
        const result =
          await this.inspectDueDelivery(item.id);

        if (result === 'READY') ready++;
        if (result === 'SKIPPED') skipped++;
      }

      if (ready > 0 || skipped > 0) {
        this.logger.log(
          `Queue inspection: ready=${ready}, skipped=${skipped}, sent=0`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Notification queue inspection failed.',
        error instanceof Error
          ? error.stack
          : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
