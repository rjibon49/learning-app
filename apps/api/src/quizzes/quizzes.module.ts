
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import { AdminAuthModule } from
  '../admin-auth/admin-auth.module.js';

import {
  PublicQuizzesController,
  AdminQuizzesController,
} from './quizzes.controller.js';

import { QuizzesService } from
  './quizzes.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],

  controllers: [
    PublicQuizzesController,
    AdminQuizzesController,
  ],

  providers: [
    QuizzesService,
  ],

  exports: [
    QuizzesService,
  ],
})
export class QuizzesModule {}
