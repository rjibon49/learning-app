
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import { AdminAuthModule } from
  '../admin-auth/admin-auth.module.js';

import { ImportsController } from
  './imports.controller.js';

import { ImportsService } from
  './imports.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],

  controllers: [
    ImportsController,
  ],

  providers: [
    ImportsService,
  ],

  exports: [
    ImportsService,
  ],
})
export class ImportsModule {}
