
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';
import { AdminAuthModule } from
  '../admin-auth/admin-auth.module.js';
import { LearnerAuthModule } from
  '../learner-auth/learner-auth.module.js';

import {
  PromotionsController,
  AdminPromotionsController,
} from './promotions.controller.js';

import { PromotionsService } from
  './promotions.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
    LearnerAuthModule,
  ],
  controllers: [
    PromotionsController,
    AdminPromotionsController,
  ],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
