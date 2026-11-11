
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';
import { LearnerAuthModule } from
  '../learner-auth/learner-auth.module.js';
import { AdminAuthModule } from
  '../admin-auth/admin-auth.module.js';

import { SubscriptionsModule } from
  '../subscriptions/subscriptions.module.js';

import {
  PublicAdsController,
  AdminAdsController,
} from './ads.controller.js';

import { AdsService } from './ads.service.js';

@Module({
  imports: [
    PrismaModule,
    LearnerAuthModule,
    AdminAuthModule,
    SubscriptionsModule,
  ],
  controllers: [
    PublicAdsController,
    AdminAdsController,
  ],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
