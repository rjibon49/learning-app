
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

import {
  AdminJwtGuard,
} from '../admin-auth/admin-jwt.guard.js';

import {
  AdminRolesGuard,
} from '../admin-auth/admin-roles.guard.js';

import {
  AdminRoles,
} from '../admin-auth/admin-roles.decorator.js';

import { AnnouncementsService } from './announcements.service.js';

import {
  announcementInputSchema,
  announcementListQuerySchema,
} from './announcements.schemas.js';

function validate<T extends z.ZodType>(
  schema: T,
  data: unknown,
): z.output<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }

  return result.data;
}

const idSchema = z.string().trim().min(1).max(191);

@Controller('admin/announcements')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class AnnouncementsController {
  constructor(
    private readonly service: AnnouncementsService,
  ) {}

  @Get()
  list(@Query() query: unknown) {
    return this.service.list(
      validate(announcementListQuerySchema, query),
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
      validate(announcementInputSchema, body),
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.update(
      validate(idSchema, id),
      validate(announcementInputSchema, body),
    );
  }

  @Post(':id/publish')
  @AdminRoles('SUPER_ADMIN')
  publish(@Param('id') id: string) {
    return this.service.publish(
      validate(idSchema, id),
    );
  }

  @Post(':id/pause')
  @AdminRoles('SUPER_ADMIN')
  pause(@Param('id') id: string) {
    return this.service.pause(
      validate(idSchema, id),
    );
  }

  @Post(':id/archive')
  @AdminRoles('SUPER_ADMIN')
  archive(@Param('id') id: string) {
    return this.service.archive(
      validate(idSchema, id),
    );
  }
}
