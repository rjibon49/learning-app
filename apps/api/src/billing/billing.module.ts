import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module.js';
import { LearnerAuthModule } from '../learner-auth/learner-auth.module.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { BillingManagementService } from './billing.service.js';
import { LearnerBillingController, AdminBillingController } from './billing.controller.js';
@Module({ imports: [PrismaModule, LearnerAuthModule, AdminAuthModule],
  controllers: [LearnerBillingController, AdminBillingController],
  providers: [BillingManagementService] })
export class BillingManagementModule {}
