
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import { LearnerAuthModule } from
  '../learner-auth/learner-auth.module.js';

import { AdminAuthModule } from
  '../admin-auth/admin-auth.module.js';

import {
  SubscriptionsController,
  AdminSubscriptionsController,
} from './subscriptions.controller.js';

import { SubscriptionsService } from
  './subscriptions.service.js';

@Module({
  imports: [
    PrismaModule,
    LearnerAuthModule,
    AdminAuthModule,
  ],

  controllers: [
    SubscriptionsController,
    AdminSubscriptionsController,
  ],

  providers: [
    SubscriptionsService,
  ],

  exports: [
    SubscriptionsService,
  ],
})
export class SubscriptionsModule {}
