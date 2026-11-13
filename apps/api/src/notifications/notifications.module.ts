
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import {
  AdminAuthModule,
} from '../admin-auth/admin-auth.module.js';

import {
  ProviderSettingsController,
} from './provider-settings.controller.js';

import {
  ProviderSettingsService,
} from './provider-settings.service.js';

import {
  NotificationTemplatesController,
} from './notification-templates.controller.js';

import {
  NotificationTemplatesService,
} from './notification-templates.service.js';

import {
  NotificationQueueController,
} from './notification-queue.controller.js';

import {
  NotificationQueueService,
} from './notification-queue.service.js';

import { NotificationWorkerService } from './notification-worker.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],

  controllers: [
    ProviderSettingsController,
    NotificationTemplatesController,
    NotificationQueueController,
  ],

  providers: [
    ProviderSettingsService,
    NotificationTemplatesService,
    NotificationQueueService,
    NotificationWorkerService,
  ],

  exports: [
    ProviderSettingsService,
    NotificationTemplatesService,
    NotificationQueueService,
  ],
})
export class NotificationsModule {}
