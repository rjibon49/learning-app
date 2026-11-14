import { BadRequestException, Body, Controller, Get, Header, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { UnsubscribeService } from './unsubscribe.service.js';

const inputSchema = z.strictObject({ token: z.string().min(40).max(3000) });
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] ?? char);
}

@Controller('notifications')
export class UnsubscribeController {
  constructor(private readonly service: UnsubscribeService) {}

  /** GET shows confirmation only; mail scanners must never trigger opt-out. */
  @Get('unsubscribe')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
  confirm(@Query('token') token: string): string {
    const parsed = inputSchema.safeParse({ token });
    if (!parsed.success) throw new BadRequestException('Invalid unsubscribe link');
    const safe = escapeHtml(parsed.data.token);
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences</title><meta name="referrer" content="no-referrer"><style>body{font:16px system-ui,sans-serif;max-width:34rem;margin:12vh auto;padding:1rem;line-height:1.6}button{padding:.75rem 1.2rem;cursor:pointer}form{margin-top:1.5rem}</style></head><body><main><h1>Unsubscribe from marketing email</h1><p>Confirm to stop promotional emails from this service. Transactional and security emails are unaffected.</p><form method="post"><input type="hidden" name="token" value="${safe}"><button type="submit">Confirm unsubscribe</button></form></main></body></html>`;
  }

  @Post('unsubscribe')
  @Throttle({ short: { limit: 5, ttl: 60000 }, medium: { limit: 20, ttl: 600000 } })
  unsubscribe(@Body() body: unknown) {
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Invalid request');
    return this.service.unsubscribe(parsed.data.token);
  }
}
