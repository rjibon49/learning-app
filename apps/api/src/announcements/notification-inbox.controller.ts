
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import {
  LearnerJwtGuard,
} from '../learner-auth/learner-jwt.guard.js';

import type {
  LearnerRequest,
} from '../learner-auth/learner-jwt.guard.js';

import {
  NotificationInboxService,
} from './notification-inbox.service.js';

import {
  notificationIdSchema,
  notificationInboxQuerySchema,
} from './notification-inbox.schemas.js';

import type {
  NotificationInboxQuery,
} from './notification-inbox.schemas.js';

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

@Controller('auth/learner/notifications')
@UseGuards(LearnerJwtGuard)
export class NotificationInboxController {
  constructor(
    private readonly inbox: NotificationInboxService,
  ) {}

  private userId(request: LearnerRequest): string {
    const id = request.learner?.id;

    if (!id) {
      throw new UnauthorizedException(
        'Learner login required.',
      );
    }

    return id;
  }

  private query(input: unknown): NotificationInboxQuery {
    return validate(notificationInboxQuerySchema, input);
  }

  @Get()
  @Throttle({
    short: { limit: 30, ttl: 60000 },
    medium: { limit: 100, ttl: 600000 },
  })
  list(
    @Req() request: LearnerRequest,
    @Query() query: unknown,
  ) {
    return this.inbox.list(
      this.userId(request),
      this.query(query),
    );
  }

  @Get('unread-count')
  @Throttle({
    short: { limit: 30, ttl: 60000 },
  })
  unreadCount(
    @Req() request: LearnerRequest,
    @Query() query: unknown,
  ) {
    return this.inbox.unreadCount(
      this.userId(request),
      this.query(query),
    );
  }

  @Post(':id/read')
  @Throttle({
    short: { limit: 20, ttl: 60000 },
  })
  markRead(
    @Req() request: LearnerRequest,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return this.inbox.markRead(
      this.userId(request),
      validate(notificationIdSchema, id),
      this.query(query),
    );
  }

  @Post(':id/dismiss')
  @Throttle({
    short: { limit: 20, ttl: 60000 },
  })
  dismiss(
    @Req() request: LearnerRequest,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return this.inbox.dismiss(
      this.userId(request),
      validate(notificationIdSchema, id),
      this.query(query),
    );
  }
}
