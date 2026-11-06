import { Module } from '@nestjs/common';
import { AdminsController } from './admins.controller.js';
import { AdminsService } from './admins.service.js';
import { PrismaModule } from '../prisma.module.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [AdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}