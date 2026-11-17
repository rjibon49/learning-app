
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma.module.js';

import { LearnerAuthController } from './learner-auth.controller.js';
import { LearnerAuthService } from './learner-auth.service.js';
import { LearnerJwtGuard } from './learner-jwt.guard.js';
import { PasswordResetMailService } from './password-reset-mail.service.js';
import { LearnerAccountDeletionService } from './account-deletion.service.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
  ],

  controllers: [
    LearnerAuthController,
  ],

  providers: [
    LearnerAuthService,
    LearnerJwtGuard,
    PasswordResetMailService,
    LearnerAccountDeletionService,
  ],

  exports: [
    LearnerJwtGuard,
    LearnerAuthService,
    LearnerAccountDeletionService,
  ],
})
export class LearnerAuthModule {}
