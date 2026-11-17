
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import { LearnerJwtGuard } from
  '../learner-auth/learner-jwt.guard.js';
import type { LearnerRequest } from
  '../learner-auth/learner-jwt.guard.js';

import { AdminJwtGuard } from
  '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from
  '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from
  '../admin-auth/admin-roles.decorator.js';

import { PromotionsService } from
  './promotions.service.js';

import {
  promotionIdSchema,
  promoCodeSchema,
  applyReferralSchema,
  createPromoSchema,
  updatePromoSchema,
  setPromoStatusSchema,
  promoListSchema,
} from './promotions.schemas.js';

import { isPermanent, validate } from '../common/validation.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';

@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotions: PromotionsService,
  ) {}

  @Get('code/:code')
  @Throttle({
    short: { limit: 10, ttl: 60000 },
  })
  checkCode(@Param('code') code: string) {
    return this.promotions.validatePromoCode(
      validate(promoCodeSchema, code),
    );
  }

  @Get('referral/me')
  @UseGuards(LearnerJwtGuard)
  myCode(@Req() request: LearnerRequest) {
    if (!request.learner?.id) {
      throw new UnauthorizedException();
    }
    return this.promotions.getMyReferralCode(
      request.learner.id,
    );
  }

  @Post('referral/apply')
  @UseGuards(LearnerJwtGuard)
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    medium: { limit: 8, ttl: 3600000 },
  })
  applyReferral(
    @Req() request: LearnerRequest,
    @Body() body: unknown,
  ) {
    if (!request.learner?.id) {
      throw new UnauthorizedException();
    }

    return this.promotions.applyReferralCode(
      request.learner.id,
      validate(applyReferralSchema, body),
    );
  }
}

@Controller('admin/promotions')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class AdminPromotionsController {
  constructor(
    private readonly promotions: PromotionsService,
    private readonly permanentDelete: PermanentDeleteService,
  ) {}

  @Get('codes')
  list(@Query() query: unknown) {
    return this.promotions.getAllPromoCodes(
      validate(promoListSchema, query),
    );
  }

  @Post('codes')
  create(@Body() body: unknown) {
    return this.promotions.createPromoCode(
      validate(createPromoSchema, body),
    );
  }

  @Patch('codes/:id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.promotions.updatePromoCode(
      validate(promotionIdSchema, id),
      validate(updatePromoSchema, body),
    );
  }

  @Patch('codes/:id/status')
  status(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = validate(setPromoStatusSchema, body);

    return this.promotions.togglePromoCode(
      validate(promotionIdSchema, id),
      input.isActive,
    );
  }

  @Delete('codes/:id')
  disable(
    @Param('id') rawId: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const id = validate(promotionIdSchema, rawId);

    // ?permanent=true -> Super Admin hard delete (audit-logged)
    if (isPermanent(query)) {
      return this.permanentDelete.run(admin, 'PromoCode', id, (tx) =>
        tx.promoCode.delete({ where: { id }, select: { id: true } }),
      );
    }

    return this.promotions.deletePromoCode(id);
  }
}
