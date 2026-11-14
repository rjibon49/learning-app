
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

import { AudienceService } from './audience.service.js';

import {
  audienceListSchema,
  createAudienceSchema,
  updateAudienceSchema,
  announcementTargetsSchema,
} from './audience.schemas.js';

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

@Controller('admin/audiences')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class AudienceController {
  constructor(
    private readonly audiences: AudienceService,
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
