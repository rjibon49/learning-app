
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

const idSchema = z.string().trim().min(1).max(191);

@Controller('admin/notification-templates')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class NotificationTemplatesController {
  constructor(
    private readonly service: NotificationTemplatesService,
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
}
