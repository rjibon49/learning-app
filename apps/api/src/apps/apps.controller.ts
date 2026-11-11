
import {
  BadRequestException,
  Body,
  Controller,
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
}
