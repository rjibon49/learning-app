import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { PrismaModule } from '../prisma.module.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}