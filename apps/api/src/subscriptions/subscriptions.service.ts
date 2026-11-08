import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { SubscriptionStatus, SubscriptionPlatform } from '../generated/prisma/client.js';
import type { CreateSubscriptionDto, UpdateSubscriptionDto, CheckoutSubscriptionDto } from './dto/subscription.dto.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllSubscriptions(appId?: string) {
    return this.prisma.subscription.findMany({
      where: appId ? { appId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        app: { select: { id: true, name: true } },
      },
    });
  }

  async createSubscription(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({ data: dto as any });
  }

  // চেকআউট এবং প্রোমো কোড ডিসকাউন্ট সহ সাবস্ক্রিপশন ক্রিয়েট ও অ্যাড-ফ্রি আপডেট
  async checkoutSubscription(dto: CheckoutSubscriptionDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const app = await this.prisma.app.findUnique({ where: { id: dto.appId } });
    if (!app) throw new NotFoundException('App not found');

    // সিস্টেম সেটিংস থেকে অ্যাড-ফ্রি সাবস্ক্রিপশনের প্রাইস আনা (ডিফল্ট মানসহ)
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: ['AD_FREE_MONTHLY_PRICE', 'AD_FREE_YEARLY_PRICE'] } },
    });

    const monthlyPrice = Number(settings.find(s => s.key === 'AD_FREE_MONTHLY_PRICE')?.value || 1.99);
    const yearlyPrice = Number(settings.find(s => s.key === 'AD_FREE_YEARLY_PRICE')?.value || 14.99);

    const originalPrice = dto.planType === 'YEARLY' ? yearlyPrice : monthlyPrice;
    let discountAmount = 0;
    let finalPrice = originalPrice;

    // প্রোমো কোড ভ্যালিডেশন ও ডিসকাউন্ট হিসাব
    if (dto.promoCode) {
      const promo = await this.prisma.promoCode.findUnique({ where: { code: dto.promoCode.toUpperCase() } });
      if (!promo || !promo.isActive) throw new BadRequestException('Invalid or inactive promo code.');

      const now = new Date();
      if ((promo.validFrom && promo.validFrom > now) || (promo.validUntil && promo.validUntil < now)) {
        throw new BadRequestException('Promo code has expired or is not active yet.');
      }
      if (promo.maxUses && promo.currentUses >= promo.maxUses) {
        throw new BadRequestException('Promo code usage limit has reached.');
      }

      discountAmount = Number(((originalPrice * promo.discountPct) / 100).toFixed(2));
      finalPrice = Number((originalPrice - discountAmount).toFixed(2));

      // কোডের ব্যবহার ১ বাড়িয়ে দেওয়া
      await this.prisma.promoCode.update({
        where: { id: promo.id },
        data: { currentUses: { increment: 1 } },
      });
    }

    // মেয়াদ হিসাব (মাসিক ৩০ দিন, বাৎসরিক ৩৬৫ দিন)
    const startedAt = new Date();
    const expiresAt = new Date();
    if (dto.planType === 'YEARLY') {
      expiresAt.setDate(expiresAt.getDate() + 365);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    // সাবস্ক্রিপشن তৈরি এবং ইউজারের adFreeUntil ডেট আপডেট করা
    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.create({
        data: {
          userId: dto.userId,
          appId: dto.appId,
          platform: dto.platform || SubscriptionPlatform.WEB,
          provider: 'STRIPE_OR_MANUAL',
          productId: `ad_free_${dto.planType.toLowerCase()}`,
          status: SubscriptionStatus.ACTIVE,
          startedAt,
          expiresAt,
          autoRenew: true,
          externalId: dto.externalId || null,
        },
      }),
      this.prisma.user.update({
        where: { id: dto.userId },
        data: { adFreeUntil: expiresAt },
      }),
    ]);

    return {
      message: 'Subscription checkout successful!',
      originalPrice,
      discountAmount,
      finalPrice,
      subscription,
    };
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    return this.prisma.subscription.update({ where: { id }, data: dto as any });
  }

  async deleteSubscription(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    await this.prisma.subscription.delete({ where: { id } });
  }
}