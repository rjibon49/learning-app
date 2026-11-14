
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

import { LearnerAuthModule } from '../learner-auth/learner-auth.module.js';

import { AnnouncementsController } from './announcements.controller.js';

import { AnnouncementsService } from './announcements.service.js';

import {
  AudienceController,
  AnnouncementTargetsController,
} from './audience.controller.js';

import { AudienceService } from './audience.service.js';

import { AnnouncementDeliveryController } from './announcement-delivery.controller.js';

import { AnnouncementDeliveryService } from './announcement-delivery.service.js';

import { PrivateInboxModule } from './private-inbox.module.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
    LearnerAuthModule,
    PrivateInboxModule,
  ],

  controllers: [
    AnnouncementsController,
    AudienceController,
    AnnouncementTargetsController,
    AnnouncementDeliveryController,
  ],

  providers: [
    AnnouncementsService,
    AudienceService,
    AnnouncementDeliveryService,
  ],

  exports: [
    AnnouncementsService,
    AudienceService,
    AnnouncementDeliveryService,
    PrivateInboxModule,
  ],
})
export class AnnouncementsModule {}
