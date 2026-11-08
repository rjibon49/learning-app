import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  // ==================== REFERRALS ====================
  async applyReferralCode(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.referredById) throw new BadRequestException('You have already used a referral code.');
    if (user.referralCode === code) throw new BadRequestException('You cannot use your own referral code.');

    const referrer = await this.prisma.user.findUnique({ where: { referralCode: code } });
    if (!referrer) throw new NotFoundException('Invalid referral code.');

    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'REFERRAL_REWARD_DAYS' } });
    const rewardDays = setting ? Number(setting.value) : 7;

    const addDays = (date: Date | null, days: number) => {
      const baseDate = date && date > new Date() ? date : new Date();
      return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    };

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { referredById: referrer.id, adFreeUntil: addDays(user.adFreeUntil, rewardDays) },
      }),
      this.prisma.user.update({
        where: { id: referrer.id },
        data: { adFreeUntil: addDays(referrer.adFreeUntil, rewardDays) },
      }),
    ]);

    return { message: 'Referral successful!', rewardDays };
  }

  // ==================== PROMO CODES CRUD ====================
  
  // Create
  async createPromoCode(data: any) {
    const existing = await this.prisma.promoCode.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException('Promo code already exists');
    return this.prisma.promoCode.create({ data });
  }

  // Read Public (Validation)
  async validatePromoCode(code: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { code } });
    if (!promo || !promo.isActive) throw new BadRequestException('Invalid or inactive promo code.');

    const now = new Date();
    if (promo.validFrom && promo.validFrom > now) throw new BadRequestException('Promo code is not active yet.');
    if (promo.validUntil && promo.validUntil < now) throw new BadRequestException('Promo code has expired.');
    if (promo.maxUses && promo.currentUses >= promo.maxUses) throw new BadRequestException('Usage limit reached.');

    return promo;
  }

  // Read All Admin
  async getAllPromoCodes() {
    return this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // Update
  async updatePromoCode(id: string, data: any) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promo code not found');
    return this.prisma.promoCode.update({
      where: { id },
      data,
    });
  }

  // Delete
  async deletePromoCode(id: string) {
    return this.prisma.promoCode.delete({ where: { id } });
  }

  // Toggle Active Status
  async togglePromoCode(id: string, isActive: boolean) {
    return this.prisma.promoCode.update({
      where: { id },
      data: { isActive },
    });
  }
}