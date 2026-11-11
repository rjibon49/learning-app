
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

import {
  AppsController,
  AdminAppsController,
} from './apps.controller.js';

import { AppsService } from './apps.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],

  controllers: [
    AppsController,
    AdminAppsController,
  ],

  providers: [
    AppsService,
  ],

  exports: [
    AppsService,
  ],
})
export class AppsModule {}
