
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

import {
  AdminLanguagesController,
  PublicLanguagesController,
} from './languages.controller.js';

import { LanguagesService } from './languages.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],

  controllers: [
    PublicLanguagesController,
    AdminLanguagesController,
  ],

  providers: [
    LanguagesService,
  ],

  exports: [
    LanguagesService,
  ],
})
export class LanguagesModule {}
