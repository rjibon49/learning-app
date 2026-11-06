import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllSubscriptions(appId?: string) {
    return this.prisma.subscription.findMany({
      where: appId ? { appId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
        app: { select: { id: true, name: true } },
      },
    });
  }

  async createSubscription(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({ data: dto as any });
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