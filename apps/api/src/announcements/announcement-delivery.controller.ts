
import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import type { Response } from 'express';

import {
  publicAnnouncementQuerySchema,
} from './announcement-delivery.schemas.js';

import {
  AnnouncementDeliveryService,
} from './announcement-delivery.service.js';

@Controller('announcements')
export class AnnouncementDeliveryController {
  constructor(
    private readonly delivery:
      AnnouncementDeliveryService,
  ) {}

  @Get('delivery')
  @Throttle({
    short: { limit: 30, ttl: 60000 },
    medium: { limit: 100, ttl: 600000 },
    long: { limit: 300, ttl: 3600000 },
  })
  deliver(
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed =
      publicAnnouncementQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException(
        z.flattenError(parsed.error),
      );
    }

    // Safe default: no shared caching until
    // contextual cache keys have been reviewed.
    response.setHeader('Cache-Control', 'no-store');

    return this.delivery.deliver(parsed.data);
  }
}
