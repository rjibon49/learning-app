
import {
  BadRequestException,
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
import { z } from 'zod';

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

function validate<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }
  return result.data;
}

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
  disable(@Param('id') id: string) {
    return this.promotions.deletePromoCode(
      validate(promotionIdSchema, id),
    );
  }
}
