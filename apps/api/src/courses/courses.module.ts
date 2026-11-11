
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

import {
  CoursesController,
  AdminCoursesController,
} from './courses.controller.js';

import { CoursesService } from './courses.service.js';

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],

  controllers: [
    CoursesController,
    AdminCoursesController,
  ],

  providers: [
    CoursesService,
  ],

  exports: [
    CoursesService,
  ],
})
export class CoursesModule {}
