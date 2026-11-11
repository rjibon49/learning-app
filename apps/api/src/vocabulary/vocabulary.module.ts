
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import { AdminAuthModule } from
  '../admin-auth/admin-auth.module.js';

import {
  VocabularyController,
  AdminVocabularyController,
} from './vocabulary.controller.js';

import { VocabularyService } from
  './vocabulary.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],

  controllers: [
    VocabularyController,
    AdminVocabularyController,
  ],

  providers: [
    VocabularyService,
  ],

  exports: [
    VocabularyService,
  ],
})
export class VocabularyModule {}
