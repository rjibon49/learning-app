import { BadRequestException, Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { UnsubscribeService } from './unsubscribe.service.js';

const inputSchema = z.strictObject({ token: z.string().min(40).max(3000) });
@Controller('notifications')
export class UnsubscribeController {
  constructor(private readonly service: UnsubscribeService) {}
  @Post('unsubscribe')
  @Throttle({ short: { limit: 5, ttl: 60000 }, medium: { limit: 20, ttl: 600000 } })
  unsubscribe(@Body() body: unknown) {
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Invalid request');
    return this.service.unsubscribe(parsed.data.token);
  }
}
