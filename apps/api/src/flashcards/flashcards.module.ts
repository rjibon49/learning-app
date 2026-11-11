
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import { AdminAuthModule } from
  '../admin-auth/admin-auth.module.js';

import {
  PublicFlashcardsController,
  AdminFlashcardsController,
} from './flashcards.controller.js';

import { FlashcardsService } from
  './flashcards.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],

  controllers: [
    PublicFlashcardsController,
    AdminFlashcardsController,
  ],

  providers: [
    FlashcardsService,
  ],

  exports: [
    FlashcardsService,
  ],
})
export class FlashcardsModule {}
