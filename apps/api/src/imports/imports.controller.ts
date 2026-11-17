
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import { AdminJwtGuard } from
  '../admin-auth/admin-jwt.guard.js';

import { AdminRolesGuard } from
  '../admin-auth/admin-roles.guard.js';

import { AdminRoles } from
  '../admin-auth/admin-roles.decorator.js';

import { ImportsService } from './imports.service.js';

import {
  createVocabularyImportSchema,
  importIdSchema,
  importJobsQuerySchema,
} from './imports.schemas.js';

import { validate } from '../common/validation.js';

@Controller('imports')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles(
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_EDITOR',
)
export class ImportsController {
  constructor(
    private readonly imports: ImportsService,
  ) {}

  // =====================================
  // CREATE VOCABULARY IMPORT
  // =====================================

  @Post('vocabulary')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({
    short: { limit: 2, ttl: 10000 },
    medium: { limit: 10, ttl: 60000 },
  })
  importVocabulary(@Body() body: unknown) {
    return this.imports.importVocabulary(
      validate(
        createVocabularyImportSchema,
        body,
      ),
    );
  }

  // =====================================
  // LIST IMPORT JOBS
  // =====================================

  @Get('jobs')
  findJobs(@Query() query: unknown) {
    return this.imports.findJobs(
      validate(importJobsQuerySchema, query),
    );
  }

  // =====================================
  // SINGLE IMPORT JOB DETAILS
  // =====================================

  @Get('jobs/:id')
  findJob(@Param('id') rawId: string) {
    return this.imports.findJob(
      validate(importIdSchema, rawId),
    );
  }


  /** Remove a finished import job from history (running jobs cannot be deleted). */
  @Delete('jobs/:id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  deleteJob(@Param('id') rawId: string) {
    return this.imports.deleteJob(
      validate(importIdSchema, rawId),
    );
  }
}
