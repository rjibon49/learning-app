
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma.service.js';
import { Prisma } from
  '../generated/prisma/client.js';

import type {
  CreatePromoDto,
  UpdatePromoDto,
  ApplyReferralDto,
  PromoListDto,
} from './promotions.schemas.js';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ======================================
  // Shared promo eligibility checks
  // ======================================

  private validateDates(
    start?: string | null,
    end?: string | null,
  ) {
    if (
      start &&
      end &&
      new Date(start) >= new Date(end)
    ) {
      throw new BadRequestException(
        'validUntil must be later than validFrom',
      );
    }
  }

  private eligiblePromo(promo: {
    isActive: boolean;
    validFrom: Date | null;
    validUntil: Date | null;
    currentUses: number;
    maxUses: number | null;
  }): boolean {
    const now = new Date();

    return (
      promo.isActive &&
      (!promo.validFrom || promo.validFrom <= now) &&
      (!promo.validUntil || promo.validUntil > now) &&
      (
        promo.maxUses === null ||
        promo.currentUses < promo.maxUses
      )
    );
  }

  // ======================================
  // Public: Promo preview
  // ======================================

  async validatePromoCode(code: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        discountPct: true,
        isActive: true,
        validFrom: true,
        validUntil: true,
        currentUses: true,
        maxUses: true,
      },
    });

    if (!promo || !this.eligiblePromo(promo)) {
      throw new NotFoundException(
        'Promo code is not available',
      );
    }

    return {
      code: promo.code,
      discountPct: promo.discountPct,
      eligible: true,
      // Preview only, no reservation or discount.
      applied: false,
    };
  }

  // ======================================
  // Admin: Promo management
  // ======================================

  async getAllPromoCodes(query: PromoListDto) {
    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.promoCode.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          include: {
            _count: {
              select: { redemptions: true },
            },
          },
        }),
        this.prisma.promoCode.count(),
      ]);

    return {
      data,
      pagination: {
        ...query,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async createPromoCode(data: CreatePromoDto) {
    this.validateDates(
      data.validFrom,
      data.validUntil,
    );

    try {
      return await this.prisma.promoCode.create({
        data: {
          code: data.code,
          discountPct: data.discountPct,
          description: data.description ?? null,
          isActive: data.isActive,
          validFrom: data.validFrom
            ? new Date(data.validFrom)
            : null,
          validUntil: data.validUntil
            ? new Date(data.validUntil)
            : null,
          maxUses: data.maxUses ?? null,
          currentUses: 0,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Promo code already exists',
        );
      }
      throw error;
    }
  }

  async updatePromoCode(
    id: string,
    data: UpdatePromoDto,
  ) {
    const existing = await this.prisma.promoCode.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        'Promo code not found',
      );
    }

    this.validateDates(
      data.validFrom === undefined
        ? existing.validFrom?.toISOString()
        : data.validFrom,
      data.validUntil === undefined
        ? existing.validUntil?.toISOString()
        : data.validUntil,
    );

    if (
      data.maxUses !== undefined &&
      data.maxUses !== null &&
      data.maxUses < existing.currentUses
    ) {
      throw new ConflictException(
        'maxUses cannot be less than currentUses',
      );
    }

    return this.prisma.promoCode.update({
      where: { id },
      data: {
        ...(data.discountPct !== undefined
          ? { discountPct: data.discountPct } : {}),
        ...(data.description !== undefined
          ? { description: data.description } : {}),
        ...(data.isActive !== undefined
          ? { isActive: data.isActive } : {}),
        ...(data.maxUses !== undefined
          ? { maxUses: data.maxUses } : {}),
        ...(data.validFrom !== undefined
          ? {
              validFrom: data.validFrom
                ? new Date(data.validFrom) : null,
            } : {}),
        ...(data.validUntil !== undefined
          ? {
              validUntil: data.validUntil
                ? new Date(data.validUntil) : null,
            } : {}),
      },
    });
  }

  async togglePromoCode(
    id: string,
    isActive: boolean,
  ) {
    const result = await this.prisma.promoCode.updateMany({
      where: { id },
      data: { isActive },
    });

    if (!result.count) {
      throw new NotFoundException(
        'Promo code not found',
      );
    }

    return this.prisma.promoCode.findUniqueOrThrow({
      where: { id },
    });
  }

  async deletePromoCode(id: string) {
    // Soft disable instead of deleting historical data.
    return this.togglePromoCode(id, false);
  }

  // ======================================
  // Learner: Own referral code
  // ======================================

  async getMyReferralCode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referralCode: true,
        referredById: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Learner not found',
      );
    }

    if (user.referralCode) {
      return {
        code: user.referralCode,
        referredById: user.referredById,
      };
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const code =
        'L' + randomBytes(7)
          .toString('hex')
          .toUpperCase();

      try {
        const result = await this.prisma.user.updateMany({
          where: {
            id: userId,
            referralCode: null,
          },
          data: { referralCode: code },
        });

        if (result.count === 1) {
          return {
            code,
            referredById: user.referredById,
          };
        }

        const updated = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            referralCode: true,
            referredById: true,
          },
        });

        if (updated?.referralCode) {
          return {
            code: updated.referralCode,
            referredById: updated.referredById,
          };
        }
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException(
      'Could not allocate referral code',
    );
  }

  // ======================================
  // Learner: Apply referral
  // ======================================

  async applyReferralCode(
    userId: string,
    input: ApplyReferralDto,
  ) {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: input.code },
      select: {
        id: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (
      !referrer ||
      !referrer.isActive ||
      !referrer.emailVerifiedAt
    ) {
      throw new BadRequestException(
        'Referral code is invalid',
      );
    }

    if (referrer.id === userId) {
      throw new BadRequestException(
        'You cannot use your own referral code',
      );
    }

    const result = await this.prisma.user.updateMany({
      where: {
        id: userId,
        referredById: null,
        isActive: true,
        emailVerifiedAt: { not: null },
      },
      data: {
        referredById: referrer.id,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'Referral already applied or account unavailable',
      );
    }

    // No ad-free reward is granted here.
    // Reward qualification is handled in a future
    // verified-event processing integration.
    return {
      success: true,
      referralLinked: true,
      rewardStatus: 'PENDING_QUALIFICATION',
    };
  }
}
