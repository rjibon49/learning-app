
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

import { LearnerAuthModule } from '../learner-auth/learner-auth.module.js';

import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

import { RegistrationController } from './registration.controller.js';
import { RegistrationService } from './registration.service.js';
import { RegistrationMailService } from './registration-mail.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
    LearnerAuthModule,
  ],

  controllers: [
    UsersController,
    RegistrationController,
  ],

  providers: [
    UsersService,
    RegistrationService,
    RegistrationMailService,
  ],

  exports: [
    UsersService,
    RegistrationService,
    LearnerAuthModule,
  ],
})
export class UsersModule {}
