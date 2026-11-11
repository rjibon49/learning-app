
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

import {
  SettingsController,
  PublicSettingsController,
} from './settings.controller.js';

import { SettingsService } from './settings.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],
  controllers: [
    SettingsController,
    PublicSettingsController,
  ],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
