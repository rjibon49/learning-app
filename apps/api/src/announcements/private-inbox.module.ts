import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module.js';
import { LearnerAuthModule } from '../learner-auth/learner-auth.module.js';
import { NotificationCompletionModule } from '../notifications/notification-completion.module.js';
import { PrivateInboxController } from './private-inbox.controller.js';
import { PrivateInboxService } from './private-inbox.service.js';
import { AdvancedTargetingService } from './advanced-targeting.service.js';

/** This module OWNS /api/auth/learner/notifications routes.
 * Remove the old NotificationInboxController from AnnouncementsModule before importing.
 */
@Module({
  imports: [PrismaModule, LearnerAuthModule, NotificationCompletionModule],
  controllers: [PrivateInboxController],
  providers: [PrivateInboxService, AdvancedTargetingService],
  exports: [PrivateInboxService, AdvancedTargetingService],
})
export class PrivateInboxModule {}
