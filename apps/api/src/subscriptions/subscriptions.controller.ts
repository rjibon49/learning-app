
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
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

import { SubscriptionsService } from
  './subscriptions.service.js';

import {
  checkoutSchema,
  subscriptionIdSchema,
  subscriptionListSchema,
} from './dto/subscription.dto.js';

function validate<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.output<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }

  return result.data;
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly service: SubscriptionsService,
  ) {}

  // Public pricing catalog.
  @Get('plans')
  plans() {
    return this.service.getPlans();
  }

  // No anonymous checkout is allowed.
  @Post('checkout')
  @UseGuards(LearnerJwtGuard)
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    medium: { limit: 10, ttl: 600000 },
  })
  checkout(
    @Req() request: LearnerRequest,
    @Body() body: unknown,
  ) {
    if (!request.learner?.id) {
      throw new UnauthorizedException();
    }

    return this.service.checkout(
      request.learner.id,
      validate(checkoutSchema, body),
    );
  }

  @Get('me')
  @UseGuards(LearnerJwtGuard)
  mySubscriptions(
    @Req() request: LearnerRequest,
    @Query() query: unknown,
  ) {
    if (!request.learner?.id) {
      throw new UnauthorizedException();
    }

    return this.service.mySubscriptions(
      request.learner.id,
      validate(subscriptionListSchema, query),
    );
  }

  @Get('entitlements/:appId')
  @UseGuards(LearnerJwtGuard)
  entitlement(
    @Req() request: LearnerRequest,
    @Param('appId') rawAppId: string,
  ) {
    if (!request.learner?.id) {
      throw new UnauthorizedException();
    }

    return this.service.getEntitlement(
      request.learner.id,
      validate(subscriptionIdSchema, rawAppId),
    );
  }
}

@Controller('admin/subscriptions')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class AdminSubscriptionsController {
  constructor(
    private readonly service: SubscriptionsService,
  ) {}

  @Get()
  findAll(@Query() query: unknown) {
    return this.service.findAllAdmin(
      validate(subscriptionListSchema, query),
    );
  }
}
