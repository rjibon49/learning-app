
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { z } from 'zod';

import { AdminJwtGuard } from
  '../admin-auth/admin-jwt.guard.js';

import { AdminRolesGuard } from
  '../admin-auth/admin-roles.guard.js';

import { AdminRoles } from
  '../admin-auth/admin-roles.decorator.js';

import { DocumentsService } from './documents.service.js';

import {
  documentIdSchema,
  documentJobsQuerySchema,
  uploadDocumentSchema,
} from './documents.schemas.js';

function validate<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.output<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }

  return result.data;
}

@Controller('admin/documents')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles(
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_EDITOR',
)
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
  ) {}

  @Post('upload')
  @Throttle({
    short: { limit: 2, ttl: 10000 },
    medium: { limit: 10, ttl: 60000 },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 20 * 1024 * 1024,
        files: 1,
        fields: 3,
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: unknown,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Select a DOCX, PPTX or XLSX file',
      );
    }

    return this.documents.upload(
      file,
      validate(uploadDocumentSchema, body),
    );
  }

  @Get('jobs')
  findJobs(@Query() query: unknown) {
    return this.documents.findJobs(
      validate(documentJobsQuerySchema, query),
    );
  }

  @Get('jobs/:id')
  findJob(@Param('id') rawId: string) {
    return this.documents.findJob(
      validate(documentIdSchema, rawId),
    );
  }
}
