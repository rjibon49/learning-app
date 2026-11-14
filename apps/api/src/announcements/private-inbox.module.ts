
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import { LearnerAuthModule } from '../learner-auth/learner-auth.module.js';

import { NotificationsModule } from '../notifications/notifications.module.js';

import { PrivateInboxController } from './private-inbox.controller.js';

import { PrivateInboxService } from './private-inbox.service.js';

import { AdvancedTargetingService } from './advanced-targeting.service.js';

@Module({
  imports: [
    PrismaModule,
    LearnerAuthModule,
    NotificationsModule,
  ],

  controllers: [
    PrivateInboxController,
  ],

  providers: [
    PrivateInboxService,
    AdvancedTargetingService,
  ],

  exports: [
    PrivateInboxService,
    AdvancedTargetingService,
  ],
})
export class PrivateInboxModule {}
