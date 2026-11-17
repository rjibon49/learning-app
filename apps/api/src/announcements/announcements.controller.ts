
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

import { isPermanent, validate } from '../common/validation.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';

const idSchema = z.string().trim().min(1).max(191);

@Controller('admin/announcements')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class AnnouncementsController {
  constructor(
    private readonly service: AnnouncementsService,
    private readonly permanentDelete: PermanentDeleteService,
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


  /**
   * DELETE /admin/announcements/:id                -> archive (stops showing)
   * DELETE /admin/announcements/:id?permanent=true -> SUPER_ADMIN: delete with
   *   translations, placements, targets and learner inbox copies.
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
      return this.permanentDelete.run(admin, 'Announcement', id, (tx) =>
        tx.announcement.delete({ where: { id }, select: { id: true } }),
      );
    }

    return this.service.archive(id);
  }
}
