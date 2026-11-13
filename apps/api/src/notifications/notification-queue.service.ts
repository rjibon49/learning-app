
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createHash } from 'node:crypto';

import { PrismaService } from '../prisma.service.js';

import type {
  EnqueueNotificationInput,
  NotificationQueueListInput,
} from './notification-queue.schemas.js';

@Injectable()
export class NotificationQueueService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // CONSENT CHECK
  // ==========================================

  private async checkMarketingEligibility(
    userId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
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
      throw new ForbiddenException(
        'Recipient is not eligible for email marketing.',
      );
    }

    const consent =
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
        select: { granted: true },
      });

    // Fail closed: no explicit opt-in means
    // no marketing notification.
    if (!consent?.granted) {
      throw new ForbiddenException(
        'Recipient has not opted in to email marketing.',
      );
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
        select: { enabled: true },
      });

    // Explicit opt-out always takes precedence.
    if (preference?.enabled === false) {
      throw new ForbiddenException(
        'Recipient has disabled email marketing.',
      );
    }
  }

  // ==========================================
  // CREATE QUEUE ITEM
  // ==========================================

  async enqueue(input: EnqueueNotificationInput) {
    const template =
      await this.prisma.notificationTemplate.findUnique({
        where: { id: input.templateId },
        select: {
          id: true,
          isActive: true,
          channel: true,
          purpose: true,
          providerConfigId: true,
          parametersJson: true,
        },
      });

    if (
      !template ||
      !template.isActive ||
      template.channel !== 'EMAIL' ||
      template.purpose !== 'MARKETING'
    ) {
      throw new BadRequestException(
        'An active EMAIL/MARKETING template is required.',
      );
    }

    // Ensure all supplied variables were declared
    // in the notification template.
    const declared =
      Array.isArray(template.parametersJson)
        ? template.parametersJson
        : [];

    const parameters = declared.filter(
      (item): item is string =>
        typeof item === 'string',
    );

    if (parameters.length !== declared.length) {
      throw new BadRequestException(
        'Template parameters are invalid.',
      );
    }

    const supplied = Object.keys(input.variables);

    if (
      supplied.some((key) => !parameters.includes(key)) ||
      parameters.some((key) => !(key in input.variables))
    ) {
      throw new BadRequestException(
        'Template variables do not match the declared parameters.',
      );
    }

    await this.checkMarketingEligibility(input.userId);

    const scheduledAt = input.scheduledAt
      ? new Date(input.scheduledAt)
      : new Date();

    if (
      !Number.isFinite(scheduledAt.getTime()) ||
      scheduledAt.getTime() >
        Date.now() + 365 * 24 * 60 * 60 * 1000
    ) {
      throw new BadRequestException(
        'Schedule must be within the next 365 days.',
      );
    }

    // Stable deduplication across API restarts.
    const dedupeKey =
      'email:' +
      createHash('sha256')
        .update(
          JSON.stringify([
            input.userId,
            template.id,
            input.idempotencyKey,
          ]),
        )
        .digest('hex');

    const existing =
      await this.prisma.notificationDelivery.findUnique({
        where: { dedupeKey },
      });

    if (existing) {
      return {
        ...existing,
        alreadyExists: true,
      };
    }

    try {
      const delivery =
        await this.prisma.notificationDelivery.create({
          data: {
            userId: input.userId,
            templateId: template.id,

            providerConfigId:
              template.providerConfigId,

            channel: 'EMAIL',
            purpose: 'MARKETING',
            status: 'QUEUED',

            dedupeKey,
            scheduledAt,
            maxAttempts: 3,

            // No password, access token,
            // recipient email or phone stored.
            payloadJson: {
              locale: input.locale,
              variables: input.variables,
            },
          },
        });

      return {
        ...delivery,
        alreadyExists: false,
      };
    } catch (error) {
      // Concurrent duplicate requests can race.
      // Return the existing idempotent job.
      const duplicate =
        await this.prisma.notificationDelivery.findUnique({
          where: { dedupeKey },
        });

      if (duplicate) {
        return {
          ...duplicate,
          alreadyExists: true,
        };
      }

      throw error;
    }
  }

  // ==========================================
  // LIST QUEUE
  // ==========================================

  async list(query: NotificationQueueListInput) {
    const where = query.status
      ? { status: query.status }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.notificationDelivery.findMany({
        where,
        select: {
          id: true,
          channel: true,
          purpose: true,
          status: true,
          userId: true,
          templateId: true,
          providerConfigId: true,
          attempts: true,
          maxAttempts: true,
          scheduledAt: true,
          nextRetryAt: true,
          sentAt: true,
          deliveredAt: true,
          errorCode: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),

      this.prisma.notificationDelivery.count({
        where,
      }),
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

  // ==========================================
  // DELIVERY DETAILS
  // ==========================================

  async findOne(id: string) {
    const item =
      await this.prisma.notificationDelivery.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          templateId: true,
          channel: true,
          purpose: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          scheduledAt: true,
          nextRetryAt: true,
          sentAt: true,
          deliveredAt: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Notification delivery not found.',
      );
    }

    return item;
  }

  // ==========================================
  // CANCEL A QUEUED DELIVERY
  // ==========================================

  async cancel(id: string) {
    const result =
      await this.prisma.notificationDelivery.updateMany({
        where: {
          id,
          status: 'QUEUED',
        },
        data: {
          status: 'CANCELLED',
          nextRetryAt: null,
        },
      });

    if (result.count !== 1) {
      throw new ConflictException(
        'Only queued notifications can be cancelled.',
      );
    }

    return this.findOne(id);
  }

  // ==========================================
  // MANUAL RETRY OF A FAILED DELIVERY
  // ==========================================

  async retry(id: string) {
    const item = await this.findOne(id);

    if (item.status !== 'FAILED') {
      throw new ConflictException(
        'Only failed notifications can be retried.',
      );
    }

    if (item.attempts >= item.maxAttempts) {
      throw new ConflictException(
        'Maximum delivery attempts reached.',
      );
    }

    if (item.channel !== 'EMAIL' ||
        item.purpose !== 'MARKETING' ||
        !item.userId) {
      throw new BadRequestException(
        'This delivery cannot be retried by the email marketing queue.',
      );
    }

    // Consent is checked again before re-queue.
    await this.checkMarketingEligibility(item.userId);

    const updated =
      await this.prisma.notificationDelivery.updateMany({
        where: {
          id,
          status: 'FAILED',
          attempts: { lt: item.maxAttempts },
        },
        data: {
          status: 'QUEUED',
          nextRetryAt: null,
          scheduledAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      });

    if (updated.count !== 1) {
      throw new ConflictException(
        'Delivery state changed.',
      );
    }

    return this.findOne(id);
  }
}
