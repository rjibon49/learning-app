
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

import { z } from 'zod';

import { Throttle } from '@nestjs/throttler';

import { AdminJwtGuard } from
  '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from
  '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from
  '../admin-auth/admin-roles.decorator.js';

import { LearnerJwtGuard } from
  '../learner-auth/learner-jwt.guard.js';
import type { LearnerRequest } from
  '../learner-auth/learner-jwt.guard.js';

import { AdsService } from './ads.service.js';

import {
  adIdSchema,
  CreateAdConfigSchema,
  UpdateAdConfigSchema,
  PublicAdQuerySchema,
  AdminAdQuerySchema,
} from './dto/ad-config.dto.js';

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

@Controller('ads')
export class PublicAdsController {
  constructor(private readonly ads: AdsService) {}

  @Get('config')
  @Throttle({
    short: { limit: 30, ttl: 60000 },
  })
  config(@Query() query: unknown) {
    return this.ads.publicConfig(
      validate(PublicAdQuerySchema, query),
    );
  }

  @Get('learner/config')
  @UseGuards(LearnerJwtGuard)
  learnerConfig(
    @Req() request: LearnerRequest,
    @Query() query: unknown,
  ) {
    if (!request.learner?.id) {
      throw new UnauthorizedException();
    }

    return this.ads.learnerConfig(
      request.learner.id,
      validate(PublicAdQuerySchema, query),
    );
  }
}

@Controller('admin/ads')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class AdminAdsController {
  constructor(private readonly ads: AdsService) {}

  @Get()
  findAll(@Query() query: unknown) {
    return this.ads.findAllAdsConfigs(
      validate(AdminAdQuerySchema, query),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ads.findOneAdmin(
      validate(adIdSchema, id),
    );
  }

  @Post()
  create(@Body() body: unknown) {
    return this.ads.createAdConfig(
      validate(CreateAdConfigSchema, body),
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.ads.updateAdConfig(
      validate(adIdSchema, id),
      validate(UpdateAdConfigSchema, body),
    );
  }

  @Delete(':id')
  disable(@Param('id') id: string) {
    return this.ads.deleteAdConfig(
      validate(adIdSchema, id),
    );
  }
}
