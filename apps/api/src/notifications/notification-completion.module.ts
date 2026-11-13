import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module.js';
import { DeliveryPolicyService } from './delivery-policy.service.js';
import { NotificationProviderAdapters } from './provider-adapters.js';
import { OptionalChannelAdapters } from './optional-channel-adapters.js';
import { ReliableNotificationWorkerService } from './reliable-notification-worker.service.js';
import { UnsubscribeService } from './unsubscribe.service.js';
import { UnsubscribeController } from './unsubscribe.controller.js';
/** Register exactly once. This module does not replace existing Provider/Template/Queue controllers. */
@Module({ imports: [PrismaModule], controllers: [UnsubscribeController],
  providers: [DeliveryPolicyService, NotificationProviderAdapters, OptionalChannelAdapters,
    ReliableNotificationWorkerService, UnsubscribeService],
  exports: [DeliveryPolicyService, OptionalChannelAdapters, UnsubscribeService] })
export class NotificationCompletionModule {}
