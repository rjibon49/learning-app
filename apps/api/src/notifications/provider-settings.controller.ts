
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

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

import { isPermanent, validate } from '../common/validation.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';

@Controller('admin/notification-providers')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class ProviderSettingsController {
  constructor(
    private readonly providers: ProviderSettingsService,
    private readonly permanentDelete: PermanentDeleteService,
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


  /**
   * DELETE /admin/notification-providers/:id                -> disable
   * DELETE /admin/notification-providers/:id?permanent=true -> SUPER_ADMIN: delete
   */
  @Delete(':id')
  @AdminRoles('SUPER_ADMIN')
  remove(
    @Param('id') rawId: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const id = validate(providerIdSchema, rawId);

    if (isPermanent(query)) {
      return this.permanentDelete.run(admin, 'NotificationProviderConfig', id, (tx) =>
        tx.notificationProviderConfig.delete({ where: { id }, select: { id: true } }),
      );
    }

    return this.providers.disable(id);
  }
}
