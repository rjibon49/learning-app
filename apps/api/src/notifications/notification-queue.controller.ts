
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
  NotificationQueueService,
} from './notification-queue.service.js';

import {
  enqueueNotificationSchema,
  notificationQueueListSchema,
  deliveryIdSchema,
} from './notification-queue.schemas.js';

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

@Controller('admin/notification-queue')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class NotificationQueueController {
  constructor(
    private readonly queue: NotificationQueueService,
  ) {}

  @Get()
  list(@Query() query: unknown) {
    return this.queue.list(
      validate(notificationQueueListSchema, query),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.queue.findOne(
      validate(deliveryIdSchema, id),
    );
  }

  @Post()
  @AdminRoles('SUPER_ADMIN')
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    medium: { limit: 20, ttl: 600000 },
  })
  enqueue(@Body() body: unknown) {
    return this.queue.enqueue(
      validate(enqueueNotificationSchema, body),
    );
  }

  @Post(':id/cancel')
  @AdminRoles('SUPER_ADMIN')
  cancel(@Param('id') id: string) {
    return this.queue.cancel(
      validate(deliveryIdSchema, id),
    );
  }

  @Post(':id/retry')
  @AdminRoles('SUPER_ADMIN')
  retry(@Param('id') id: string) {
    return this.queue.retry(
      validate(deliveryIdSchema, id),
    );
  }
}
