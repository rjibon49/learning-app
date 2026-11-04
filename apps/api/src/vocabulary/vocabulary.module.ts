import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

import { VocabularyController } from './vocabulary.controller.js';
import { VocabularyService } from './vocabulary.service.js';

@Module({
  imports: [
    AdminAuthModule,
  ],

  controllers: [
    VocabularyController,
  ],

  providers: [
    VocabularyService,
  ],
})
export class VocabularyModule {}