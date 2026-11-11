
import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { ActivityService } from './activity.service.js';
import { activityListSchema } from './activity.schemas.js';

import { LearnerJwtGuard } from '../learner-auth/learner-jwt.guard.js';
import type { LearnerRequest } from '../learner-auth/learner-jwt.guard.js';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

function parse(input: unknown) {
  const result = activityListSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }

  return result.data;
}

@Controller('activity')
export class ActivityController {
  constructor(
    private readonly activity: ActivityService,
  ) {}

  @Get('me')
  @UseGuards(LearnerJwtGuard)
  myActivities(
    @Req() request: LearnerRequest,
    @Query() query: unknown,
  ) {
    if (!request.learner?.id) {
      throw new UnauthorizedException();
    }

    return this.activity.findMyActivities(
      request.learner.id,
      parse(query),
    );
  }

  @Get('admin')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  adminActivities(@Query() query: unknown) {
    return this.activity.findAllActivitiesAdmin(
      parse(query),
    );
  }
}
