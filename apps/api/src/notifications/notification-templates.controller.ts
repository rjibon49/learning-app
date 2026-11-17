
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
import { z } from 'zod';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

import {
  NotificationTemplatesService,
} from './notification-templates.service.js';

import {
  createNotificationTemplateSchema,
  updateNotificationTemplateSchema,
  notificationTemplateListSchema,
  templatePreviewSchema,
} from './notification-templates.schemas.js';

import { isPermanent, validate } from '../common/validation.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';

const idSchema = z.string().trim().min(1).max(191);

@Controller('admin/notification-templates')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class NotificationTemplatesController {
  constructor(
    private readonly service: NotificationTemplatesService,
    private readonly permanentDelete: PermanentDeleteService,
  ) {}

  @Get()
  list(@Query() query: unknown) {
    return this.service.list(
      validate(notificationTemplateListSchema, query),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(
      validate(idSchema, id),
    );
  }

  @Post()
  @Throttle({
    short: { limit: 10, ttl: 60000 },
  })
  create(@Body() body: unknown) {
    return this.service.create(
      validate(createNotificationTemplateSchema, body),
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.update(
      validate(idSchema, id),
      validate(updateNotificationTemplateSchema, body),
    );
  }

  @Post(':id/preview')
  @Throttle({
    short: { limit: 20, ttl: 60000 },
  })
  preview(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.preview(
      validate(idSchema, id),
      validate(templatePreviewSchema, body),
    );
  }

  @Post(':id/activate')
  @AdminRoles('SUPER_ADMIN')
  activate(@Param('id') id: string) {
    return this.service.setActive(
      validate(idSchema, id),
      true,
    );
  }

  @Post(':id/deactivate')
  @AdminRoles('SUPER_ADMIN')
  deactivate(@Param('id') id: string) {
    return this.service.setActive(
      validate(idSchema, id),
      false,
    );
  }


  /**
   * DELETE /admin/notification-templates/:id                -> deactivate
   * DELETE /admin/notification-templates/:id?permanent=true -> SUPER_ADMIN: delete
   *   (past delivery logs are kept, their template link becomes empty).
   */
  @Delete(':id')
  @AdminRoles('SUPER_ADMIN')
  remove(
    @Param('id') rawId: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const id = validate(idSchema, rawId);

    if (isPermanent(query)) {
      return this.permanentDelete.run(admin, 'NotificationTemplate', id, (tx) =>
        tx.notificationTemplate.delete({ where: { id }, select: { id: true } }),
      );
    }

    return this.service.setActive(id, false);
  }
}
