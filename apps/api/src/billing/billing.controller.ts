import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import type { Request } from 'express';
import { LearnerJwtGuard } from '../learner-auth/learner-jwt.guard.js';
import type { LearnerRequest } from '../learner-auth/learner-jwt.guard.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';
import { BillingManagementService } from './billing.service.js';
import { cancelRequest, refundRequest, reviewRequest, pageQuery, id } from './billing.schemas.js';
function valid<T extends z.ZodType>(schema: T, value: unknown): z.output<T> { const r = schema.safeParse(value); if (!r.success) throw new BadRequestException(z.flattenError(r.error)); return r.data; }
function uid(req: LearnerRequest) { if (!req.learner?.id) throw new UnauthorizedException(); return req.learner.id; }
@Controller('auth/learner/billing')
@UseGuards(LearnerJwtGuard)
export class LearnerBillingController {
  constructor(private readonly billing: BillingManagementService) {}
  @Get('subscriptions') subscriptions(@Req() req: LearnerRequest) { return this.billing.mySubscriptions(uid(req)); }
  @Post('subscriptions/:id/cancel-request')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  cancel(@Req() req: LearnerRequest, @Param('id') subscriptionId: string, @Body() body: unknown) {
    return this.billing.cancellation(uid(req), valid(id, subscriptionId), valid(cancelRequest, body));
  }
  @Get('refunds') refunds(@Req() req: LearnerRequest) { return this.billing.myRefunds(uid(req)); }
  @Post('refunds')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  refund(@Req() req: LearnerRequest, @Body() body: unknown) { return this.billing.requestRefund(uid(req), valid(refundRequest, body)); }
}
type AdminRequest = Request & { admin?: { id: string } };
@Controller('admin/billing')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN','ADMIN')
export class AdminBillingController {
  constructor(private readonly billing: BillingManagementService) {}
  @Get('refunds') refunds(@Query() q: unknown) { return this.billing.adminRefunds(valid(pageQuery, q)); }
  @Get('cancellations') cancellations(@Query() q: unknown) { return this.billing.adminCancellations(valid(pageQuery, q)); }
  @Patch('refunds/:id/review') @AdminRoles('SUPER_ADMIN')
  review(@Req() req: AdminRequest, @Param('id') ref: string, @Body() body: unknown) {
    if (!req.admin?.id) throw new UnauthorizedException();
    return this.billing.reviewRefund(req.admin.id, valid(id, ref), valid(reviewRequest, body));
  }
}
