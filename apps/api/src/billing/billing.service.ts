import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { z } from 'zod';
import type { cancelRequest, refundRequest, reviewRequest, pageQuery } from './billing.schemas.js';
type Cancel = z.infer<typeof cancelRequest>;
type Refund = z.infer<typeof refundRequest>;
type Review = z.infer<typeof reviewRequest>;
type Page = z.infer<typeof pageQuery>;
@Injectable()
export class BillingManagementService {
  constructor(private readonly db: PrismaService) {}
  private serialize<T extends { amountMinor: bigint }>(v: T) { return { ...v, amountMinor: v.amountMinor.toString() }; }
  mySubscriptions(userId: string) { return this.db.subscription.findMany({ where: { userId }, select: {
    id: true, appId: true, platform: true, provider: true, status: true, autoRenew: true,
    expiresAt: true, cancelAtPeriodEnd: true, cancelRequestedAt: true, cancelledAt: true,
    productId: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); }
  async cancellation(userId: string, subscriptionId: string, input: Cancel) {
    const sub = await this.db.subscription.findUnique({ where: { id: subscriptionId }, select: { userId: true, status: true } });
    if (!sub || sub.userId !== userId) throw new NotFoundException('Subscription not found');
    if (!['ACTIVE','TRIAL'].includes(sub.status)) throw new ConflictException('Subscription cannot be cancelled in this state');
    const existing = await this.db.subscriptionCancellationRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.subscriptionId !== subscriptionId) throw new ConflictException('Idempotency key already belongs to another subscription');
      return existing;
    }
    // This only creates a request. A verified billing-provider action must confirm cancellation.
    return this.db.subscriptionCancellationRequest.create({ data: { subscriptionId, status: 'REQUESTED', initiatedBy: 'USER', reason: input.reason ?? null, idempotencyKey: input.idempotencyKey } });
  }
  async requestRefund(userId: string, input: Refund) {
    const payment = await this.db.paymentTransaction.findUnique({ where: { id: input.paymentId }, select: {
      id: true, userId: true, status: true, amountMinor: true, currency: true, subscriptionId: true } });
    if (!payment || payment.userId !== userId) throw new NotFoundException('Payment not found');
    if (payment.status !== 'VERIFIED' || payment.amountMinor <= 0n) throw new ConflictException('Payment is not eligible for refund review');
    const previous = await this.db.refundRequest.findFirst({ where: { paymentId: payment.id, status: { in: ['REQUESTED','UNDER_REVIEW','APPROVED','PROCESSING','REFUNDED'] } }, orderBy: { requestedAt: 'desc' } });
    if (previous) return this.serialize(previous);
    const created = await this.db.refundRequest.create({ data: { userId, paymentId: payment.id,
      subscriptionId: payment.subscriptionId, reason: input.reason, amountMinor: payment.amountMinor,
      currency: payment.currency, status: 'REQUESTED' } });
    return this.serialize(created);
  }
  async myRefunds(userId: string) { return (await this.db.refundRequest.findMany({ where: { userId }, orderBy: { requestedAt: 'desc' } })).map(x => this.serialize(x)); }
  async adminRefunds(query: Page) {
    const [data, total] = await Promise.all([
      this.db.refundRequest.findMany({ take: query.limit, skip: (query.page - 1) * query.limit, orderBy: { requestedAt: 'desc' } }), this.db.refundRequest.count(),
    ]);
    return { data: data.map(x => this.serialize(x)), pagination: { ...query, total, totalPages: Math.ceil(total / query.limit) } };
  }
  async adminCancellations(query: Page) {
    const [data, total] = await Promise.all([
      this.db.subscriptionCancellationRequest.findMany({ include: { subscription: { select: { platform: true, provider: true, userId: true, expiresAt: true } } },
        take: query.limit, skip: (query.page - 1) * query.limit, orderBy: { requestedAt: 'desc' } }), this.db.subscriptionCancellationRequest.count(),
    ]);
    return { data, pagination: { ...query, total, totalPages: Math.ceil(total / query.limit) } };
  }
  async reviewRefund(adminId: string, id: string, input: Review) {
    const changed = await this.db.refundRequest.updateMany({ where: { id, status: { in: ['REQUESTED','UNDER_REVIEW'] } }, data: {
      status: input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      reviewedByAdminId: adminId, reviewedAt: new Date(), adminNote: input.note ?? null,
      ...(input.decision === 'REJECT' ? { resolvedAt: new Date() } : {}),
    } });
    if (!changed.count) throw new ConflictException('Refund is already reviewed or not found');
    return this.serialize(await this.db.refundRequest.findUniqueOrThrow({ where: { id } }));
  }
}
