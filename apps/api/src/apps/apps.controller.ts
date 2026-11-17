
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

import { z } from 'zod';

import { AppsService } from './apps.service.js';

import {
  appSlugSchema,
  appListQuerySchema,
  createAppSchema,
  updateAppSchema,
  appConfigSchema,
} from './apps.schemas.js';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

import { isPermanent, validate } from '../common/validation.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';

const appIdSchema = z.cuid();

const statusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

// =========================================
// Public Application API
// =========================================

@Controller('apps')
export class AppsController {
  constructor(
    private readonly appsService: AppsService,
  ) {}

  @Get()
  findAll(@Query() query: unknown) {
    return this.appsService.findAll(
      validate(appListQuerySchema, query),
    );
  }

  @Get(':slug')
  findBySlug(
    @Param('slug') slug: string,
  ) {
    return this.appsService.findBySlug(
      validate(appSlugSchema, slug),
    );
  }
}

// =========================================
// Protected Admin Application API
// =========================================

@Controller('admin/apps')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles(
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_EDITOR',
)
export class AdminAppsController {
  constructor(
    private readonly appsService: AppsService,
    private readonly permanentDelete: PermanentDeleteService,
  ) {}

  @Get()
  findAll(@Query() query: unknown) {
    return this.appsService.findAllAdmin(
      validate(appListQuerySchema, query),
    );
  }

  @Get(':id')
  findOne(
    @Param('id') rawId: string,
  ) {
    const id = validate(appIdSchema, rawId);

    return this.appsService.findOneAdmin(id);
  }

  @Post()
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  create(@Body() body: unknown) {
    return this.appsService.create(
      validate(createAppSchema, body),
    );
  }

  @Patch(':id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  update(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    const id = validate(appIdSchema, rawId);

    return this.appsService.update(
      id,
      validate(updateAppSchema, body),
    );
  }

  @Patch(':id/config')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  updateConfig(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    const id = validate(appIdSchema, rawId);

    return this.appsService.updateConfig(
      id,
      validate(appConfigSchema, body),
    );
  }

  @Patch(':id/status')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  updateStatus(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    const id = validate(appIdSchema, rawId);

    const data = validate(
      statusSchema,
      body,
    );

    return this.appsService.setActive(
      id,
      data.isActive,
    );
  }

  /**
   * DELETE /admin/apps/:id                -> deactivate the app (safe, reversible)
   * DELETE /admin/apps/:id?permanent=true -> SUPER_ADMIN: delete app + its config,
   *   ad settings, flashcard decks and course links. Refused (409) while
   *   subscriptions exist for the app.
   */
  @Delete(':id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  remove(
    @Param('id') rawId: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const id = validate(appIdSchema, rawId);

    if (isPermanent(query)) {
      return this.permanentDelete.run(admin, 'App', id, (tx) =>
        tx.app.delete({ where: { id }, select: { id: true } }),
      );
    }

    return this.appsService.setActive(id, false);
  }
}
