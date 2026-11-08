import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller.js';
import { PromotionsService } from './promotions.service.js';
import { PrismaModule } from '../prisma.module.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js'; // AdminGuard এর জন্য

@Module({
  imports: [PrismaModule, AdminAuthModule], 
  controllers: [PromotionsController],
  providers: [PromotionsService],
})
export class PromotionsModule {}