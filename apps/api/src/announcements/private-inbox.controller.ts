import { BadRequestException, Controller, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { LearnerJwtGuard } from '../learner-auth/learner-jwt.guard.js';
import type { LearnerRequest } from '../learner-auth/learner-jwt.guard.js';
import { PrivateInboxService } from './private-inbox.service.js';

const querySchema = z.strictObject({
  appId: z.string().min(1).max(191).optional(), platform: z.enum(['WEB','ANDROID','IOS']).optional(),
  locale: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/).default('en'),
  page: z.coerce.number().int().min(1).max(10).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
function parse(value: unknown) {
  const r = querySchema.safeParse(value);
  if (!r.success) throw new BadRequestException(z.flattenError(r.error));
  return r.data;
}
function learner(req: LearnerRequest) {
  if (!req.learner?.id) throw new UnauthorizedException();
  return req.learner.id;
}
@Controller('auth/learner/notifications')
@UseGuards(LearnerJwtGuard)
export class PrivateInboxController {
  constructor(private readonly inbox: PrivateInboxService) {}
  @Get() list(@Req() req: LearnerRequest, @Query() query: unknown) { return this.inbox.list(learner(req), parse(query)); }
  @Get('unread-count') count(@Req() req: LearnerRequest, @Query() query: unknown) { return this.inbox.unreadCount(learner(req), parse(query)); }
  @Post(':id/read') read(@Req() req: LearnerRequest, @Param('id') id: string, @Query() query: unknown) {
    return this.inbox.markRead(learner(req), z.string().min(1).max(191).parse(id), parse(query));
  }
  @Post(':id/dismiss') dismiss(@Req() req: LearnerRequest, @Param('id') id: string, @Query() query: unknown) {
    return this.inbox.dismiss(learner(req), z.string().min(1).max(191).parse(id), parse(query));
  }
}
