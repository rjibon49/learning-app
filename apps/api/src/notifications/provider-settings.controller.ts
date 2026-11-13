
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import {
  AdminJwtGuard,
} from '../admin-auth/admin-jwt.guard.js';

import {
  AdminRolesGuard,
} from '../admin-auth/admin-roles.guard.js';

import {
  AdminRoles,
} from '../admin-auth/admin-roles.decorator.js';

import {
  ProviderSettingsService,
} from './provider-settings.service.js';

import {
  providerIdSchema,
  providerSettingsSchema,
  providerSettingsUpdateSchema,
} from './provider-settings.schemas.js';

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

@Controller('admin/notification-providers')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class ProviderSettingsController {
  constructor(
    private readonly providers: ProviderSettingsService,
  ) {}

  @Get()
  list() {
    return this.providers.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.providers.findOne(
      validate(providerIdSchema, id),
    );
  }

  @Get(':id/readiness')
  readiness(@Param('id') id: string) {
    return this.providers.readiness(
      validate(providerIdSchema, id),
    );
  }

  @Post()
  @AdminRoles('SUPER_ADMIN')
  @Throttle({
    short: { limit: 5, ttl: 60000 },
  })
  create(@Body() body: unknown) {
    return this.providers.create(
      validate(providerSettingsSchema, body),
    );
  }

  @Patch(':id')
  @AdminRoles('SUPER_ADMIN')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.providers.update(
      validate(providerIdSchema, id),
      validate(providerSettingsUpdateSchema, body),
    );
  }

  @Post(':id/disable')
  @AdminRoles('SUPER_ADMIN')
  disable(@Param('id') id: string) {
    return this.providers.disable(
      validate(providerIdSchema, id),
    );
  }
}
