
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';
import { AdminAuthModule } from
  '../admin-auth/admin-auth.module.js';

import { DocumentsController } from
  './documents.controller.js';

import { DocumentsService } from
  './documents.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],

  controllers: [
    DocumentsController,
  ],

  providers: [
    DocumentsService,
  ],

  exports: [
    DocumentsService,
  ],
})
export class DocumentsModule {}
