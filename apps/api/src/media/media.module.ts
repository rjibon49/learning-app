
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import { AdminAuthModule } from
  '../admin-auth/admin-auth.module.js';

import {
  MediaController,
  PublicMediaController,
} from './media.controller.js';

import { MediaService } from './media.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],

  controllers: [
    PublicMediaController,
    MediaController,
  ],

  providers: [
    MediaService,
  ],

  exports: [
    MediaService,
  ],
})
export class MediaModule {}
