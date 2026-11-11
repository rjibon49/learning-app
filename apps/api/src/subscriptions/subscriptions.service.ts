
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  Prisma,
} from '../generated/prisma/client.js';

import type {
  CheckoutDto,
  SubscriptionListDto,
} from './dto/subscription.dto.js';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async getPrice(planType: 'MONTHLY' | 'YEARLY') {
    const key =
      planType === 'MONTHLY'
        ? 'SUBSCRIPTION_MONTHLY_USD_CENTS'
        : 'SUBSCRIPTION_YEARLY_USD_CENTS';

    const setting =
      await this.prisma.systemSetting.findUnique({
        where: { key },
        select: { value: true },
      });

    if (!setting) {
      throw new ServiceUnavailableException(
        'Subscription pricing is not configured',
      );
    }

    const value = setting.value.trim();

    if (!/^[1-9][0-9]*$/.test(value)) {
      throw new ServiceUnavailableException(
        'Subscription price is invalid',
      );
    }

    const amountMinor = BigInt(value);

    if (amountMinor > 100000000n) {
      throw new ServiceUnavailableException(
        'Subscription price exceeds allowed range',
      );
    }

    return {
      productId:
        `ad_free_${planType.toLowerCase()}`,
      planType,
      amountMinor,
      currency: 'USD',
    };
  }

  async getPlans() {
    const monthly = await this.getPrice('MONTHLY');
    const yearly = await this.getPrice('YEARLY');

    return [
      {
        planType: monthly.planType,
        productId: monthly.productId,
        amountMinor: Number(monthly.amountMinor),
        currency: monthly.currency,
      },
      {
        planType: yearly.planType,
        productId: yearly.productId,
        amountMinor: Number(yearly.amountMinor),
        currency: yearly.currency,
      },
    ];
  }

  // =========================================
  // Learner: Create checkout intent
  // =========================================

  async checkout(userId: string, input: CheckoutDto) {
    const app = await this.prisma.app.findUnique({
      where: { id: input.appId },
      include: { config: true },
    });

    if (
      !app ||
      !app.isActive ||
      !app.config?.subscriptionsEnabled
    ) {
      throw new BadRequestException(
        'Subscriptions are unavailable for this app',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (!user?.isActive || !user.emailVerifiedAt) {
      throw new BadRequestException(
        'Verified learner account required',
      );
    }

    const price = await this.getPrice(input.planType);

    const provider = 'INTERNAL_CHECKOUT';

    const checkoutId = input.checkoutRequestId;

    // A repeated request returns its original intent.
    const existing =
      await this.prisma.paymentTransaction.findUnique({
        where: {
          provider_externalTransactionId: {
            provider,
            externalTransactionId: checkoutId,
          },
        },
        include: { subscription: true },
      });

    if (existing) {
      if (
        existing.userId !== userId ||
        existing.subscription?.appId !== input.appId ||
        existing.subscription.productId !== price.productId
      ) {
        throw new ConflictException(
          'Checkout request ID is already in use',
        );
      }

      return {
        checkoutId,
        paymentId: existing.id,
        subscriptionId: existing.subscriptionId,
        status: existing.status,
        amountMinor: Number(existing.amountMinor),
        currency: existing.currency,
        paymentReady: false,
      };
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const subscription =
            await tx.subscription.create({
              data: {
                userId,
                appId: input.appId,
                platform: 'WEB',
                provider,
                productId: price.productId,
                status: 'PENDING',
                startedAt: null,
                expiresAt: null,
                autoRenew: false,
              },
            });

          const payment =
            await tx.paymentTransaction.create({
              data: {
                userId,
                subscriptionId: subscription.id,
                provider,
                externalTransactionId: checkoutId,
                status: 'PENDING',
                amountMinor: price.amountMinor,
                currency: price.currency,
              },
            });

          return {
            checkoutId,
            paymentId: payment.id,
            subscriptionId: subscription.id,
            status: payment.status,
            amountMinor: Number(payment.amountMinor),
            currency: payment.currency,

            // No payment gateway is connected yet.
            paymentReady: false,
          };
        },
      );
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        // Concurrent duplicate checkout requests:
        // the caller can retry with the same ID.
        throw new ConflictException(
          'Checkout already exists. Retry using the same request ID.',
        );
      }

      throw error;
    }
  }

  // =========================================
  // Learner: Subscription history
  // =========================================

  async mySubscriptions(
    userId: string,
    query: SubscriptionListDto,
  ) {
    const where: Prisma.SubscriptionWhereInput = {
      userId,

      ...(query.appId
        ? { appId: query.appId }
        : {}),

      ...(query.status
        ? { status: query.status }
        : {}),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.subscription.findMany({
          where,
          select: {
            id: true,
            appId: true,
            platform: true,
            provider: true,
            productId: true,
            status: true,
            startedAt: true,
            expiresAt: true,
            autoRenew: true,
            createdAt: true,
            app: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),

        this.prisma.subscription.count({ where }),
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

  // =========================================
  // Learner: Effective entitlements
  // =========================================

  async getEntitlement(
    userId: string,
    appId: string,
  ) {
    const app = await this.prisma.app.findUnique({
      where: { id: appId },
      include: { config: true },
    });

    if (!app?.isActive) {
      throw new NotFoundException('App not found');
    }

    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { adFreeUntil: true },
    });

    if (!user) {
      throw new NotFoundException('Learner not found');
    }

    // Never trust ACTIVE status alone:
    // require a verified provider payment.
    const subscription =
      await this.prisma.subscription.findFirst({
        where: {
          userId,
          appId,
          status: 'ACTIVE',
          startedAt: { lte: now },
          expiresAt: { gt: now },
          payments: {
            some: {
              status: 'VERIFIED',
              verifiedAt: { not: null },
              refundedAt: null,
            },
          },
        },
        orderBy: { expiresAt: 'desc' },
        select: {
          id: true,
          expiresAt: true,
        },
      });

    const subscriptionEnd =
      subscription?.expiresAt ?? null;

    const rewardEnd =
      user.adFreeUntil &&
      user.adFreeUntil > now
        ? user.adFreeUntil
        : null;

    const eligible =
      Boolean(subscriptionEnd) ||
      Boolean(rewardEnd);

    const candidates = [
      subscriptionEnd,
      rewardEnd,
    ].filter((value): value is Date => value !== null);

    const adFreeUntil = candidates.length
      ? new Date(
          Math.max(...candidates.map(
            (value) => value.getTime(),
          )),
        )
      : null;

    return {
      appId,
      adFree: eligible,
      adFreeUntil,
      subscriptionActive: Boolean(subscriptionEnd),
      subscriptionsEnabled:
        app.config?.subscriptionsEnabled ?? false,
      adsEnabled:
        (app.config?.adsEnabled ?? true) && !eligible,
    };
  }

  // =========================================
  // Admin: Reporting
  // =========================================

  async findAllAdmin(query: SubscriptionListDto) {
    const where: Prisma.SubscriptionWhereInput = {
      ...(query.appId
        ? { appId: query.appId }
        : {}),
      ...(query.status
        ? { status: query.status }
        : {}),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.subscription.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
            app: {
              select: {
                id: true,
                name: true,
              },
            },
            payments: {
              select: {
                id: true,
                provider: true,
                status: true,
                amountMinor: true,
                currency: true,
                verifiedAt: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.subscription.count({ where }),
      ]);

    return {
      data: data.map((subscription) => ({
        ...subscription,
        payments: subscription.payments.map(
          (payment) => ({
            ...payment,
            amountMinor: payment.amountMinor.toString(),
          }),
        ),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
