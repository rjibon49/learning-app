
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

import { AudienceService } from './audience.service.js';

import {
  audienceListSchema,
  createAudienceSchema,
  updateAudienceSchema,
  announcementTargetsSchema,
} from './audience.schemas.js';

import { isPermanent, validate } from '../common/validation.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';

const idSchema = z.string().trim().min(1).max(191);

@Controller('admin/audiences')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class AudienceController {
  constructor(
    private readonly audiences: AudienceService,
    private readonly permanentDelete: PermanentDeleteService,
  ) {}

  @Get()
  list(@Query() query: unknown) {
    return this.audiences.list(
      validate(audienceListSchema, query),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.audiences.findOne(
      validate(idSchema, id),
    );
  }

  @Post()
  @Throttle({
    short: { limit: 10, ttl: 60000 },
  })
  create(@Body() body: unknown) {
    return this.audiences.create(
      validate(createAudienceSchema, body),
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.audiences.update(
      validate(idSchema, id),
      validate(updateAudienceSchema, body),
    );
  }

  @Post(':id/activate')
  @AdminRoles('SUPER_ADMIN')
  activate(@Param('id') id: string) {
    return this.audiences.setActive(
      validate(idSchema, id),
      true,
    );
  }

  @Post(':id/deactivate')
  @AdminRoles('SUPER_ADMIN')
  deactivate(@Param('id') id: string) {
    return this.audiences.setActive(
      validate(idSchema, id),
      false,
    );
  }


  /**
   * DELETE /admin/audiences/:id                -> deactivate
   * DELETE /admin/audiences/:id?permanent=true -> SUPER_ADMIN: delete. Refused (409)
   *   while an announcement still targets this audience.
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
      return this.permanentDelete.run(admin, 'AudienceSegment', id, (tx) =>
        tx.audienceSegment.delete({ where: { id }, select: { id: true } }),
      );
    }

    return this.audiences.setActive(id, false);
  }
}

@Controller('admin/announcements')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class AnnouncementTargetsController {
  constructor(
    private readonly audiences: AudienceService,
  ) {}

  @Patch(':id/targets')
  @AdminRoles('SUPER_ADMIN')
  setTargets(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.audiences.setAnnouncementTargets(
      validate(idSchema, id),
      validate(announcementTargetsSchema, body),
    );
  }
}
