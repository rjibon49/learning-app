import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { UnsubscribeService } from './unsubscribe.service.js';
const body = z.strictObject({ token: z.string().min(20).max(2048) });
/** Safe unsubscribe requires POST. GET must never mutate preferences because email security scanners prefetch links. */
@Controller('marketing/unsubscribe')
export class UnsubscribeLandingController {
  constructor(private readonly service: UnsubscribeService) {}
  @Get() info() { return { available: true, instructions: 'Submit your unsubscribe token using POST', method: 'POST' }; }
  @Post() unsubscribe(@Body() input: unknown) {
    const parsed = body.safeParse(input);
    if (!parsed.success) throw new BadRequestException(z.flattenError(parsed.error));
    return this.service.unsubscribe(parsed.data.token);
  }
}
