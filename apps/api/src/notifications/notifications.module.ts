import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { ProviderSettingsController } from './provider-settings.controller.js';
import { ProviderSettingsService } from './provider-settings.service.js';
import { NotificationTemplatesController } from './notification-templates.controller.js';
import { NotificationTemplatesService } from './notification-templates.service.js';
import { NotificationQueueController } from './notification-queue.controller.js';
import { NotificationQueueService } from './notification-queue.service.js';
import { DeliveryPolicyService } from './delivery-policy.service.js';
import { NotificationProviderAdapters } from './provider-adapters.js';
import { OptionalChannelAdapters } from './optional-channel-adapters.js';
import { ReliableNotificationWorkerService } from './reliable-notification-worker.service.js';
import { UnsubscribeService } from './unsubscribe.service.js';
import { UnsubscribeController } from './unsubscribe.controller.js';

/** Important: only ONE worker is registered; original NotificationWorkerService is retired. */
@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [ProviderSettingsController, NotificationTemplatesController,
    NotificationQueueController, UnsubscribeController],
  providers: [ProviderSettingsService, NotificationTemplatesService,
    NotificationQueueService, DeliveryPolicyService, NotificationProviderAdapters,
    OptionalChannelAdapters, ReliableNotificationWorkerService, UnsubscribeService],
  exports: [ProviderSettingsService, NotificationTemplatesService, NotificationQueueService,
    DeliveryPolicyService, OptionalChannelAdapters, UnsubscribeService],
})
export class NotificationsModule {}
