
import {
  BadRequestException,
  Controller,
  Get,
  Patch,
  Post,
  Body,
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
  MarketingPreferencesService,
} from './marketing-preferences.service.js';

import {
  marketingPreferencesSchema,
} from './marketing-preferences.schemas.js';

@Controller('auth/learner')
@UseGuards(LearnerJwtGuard)
export class MarketingPreferencesController {
  constructor(
    private readonly preferences:
      MarketingPreferencesService,
  ) {}

  private getUserId(request: LearnerRequest): string {
    const userId = request.learner?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Learner authentication required',
      );
    }

    return userId;
  }

  // ==========================================
  // GET MARKETING PREFERENCES
  // ==========================================

  @Get('marketing-preferences')
  @Throttle({
    short: { limit: 20, ttl: 60000 },
    medium: { limit: 60, ttl: 600000 },
  })
  getPreferences(
    @Req() request: LearnerRequest,
  ) {
    return this.preferences.getPreferences(
      this.getUserId(request),
    );
  }

  // ==========================================
  // UPDATE MARKETING PREFERENCES
  // ==========================================

  @Patch('marketing-preferences')
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    medium: { limit: 20, ttl: 600000 },
  })
  updatePreferences(
    @Req() request: LearnerRequest,
    @Body() body: unknown,
  ) {
    const result =
      marketingPreferencesSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException(
        z.flattenError(result.error),
      );
    }

    return this.preferences.updatePreferences(
      this.getUserId(request),
      result.data,
    );
  }

  // ==========================================
  // UNSUBSCRIBE FROM ALL MARKETING
  // ==========================================

  @Post('marketing-unsubscribe')
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    medium: { limit: 20, ttl: 600000 },
  })
  unsubscribe(
    @Req() request: LearnerRequest,
  ) {
    return this.preferences.unsubscribeAll(
      this.getUserId(request),
    );
  }
}
