
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Redirect,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import { FileInterceptor } from
  '@nestjs/platform-express';

import { Throttle } from '@nestjs/throttler';

import { memoryStorage } from 'multer';
import { z } from 'zod';

import { AdminJwtGuard } from
  '../admin-auth/admin-jwt.guard.js';

import { AdminRolesGuard } from
  '../admin-auth/admin-roles.guard.js';

import { AdminRoles } from
  '../admin-auth/admin-roles.decorator.js';

import { MediaService } from './media.service.js';

import {
  mediaIdSchema,
  mediaUploadSchema,
  mediaListSchema,
} from './media.schemas.js';

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

// =======================================
// PUBLIC MEDIA DELIVERY
// =======================================

@Controller('media/public')
export class PublicMediaController {
  constructor(
    private readonly media: MediaService,
  ) {}

  @Get(':id')
  @Redirect()
  @Throttle({
    short: { limit: 30, ttl: 1000 },
    medium: { limit: 300, ttl: 60000 },
  })
  async access(@Param('id') rawId: string) {
    const id = validate(mediaIdSchema, rawId);

    const result =
      await this.media.getPublicAccess(id);

    return {
      url: result.url,
      statusCode: 302,
    };
  }
}

// =======================================
// ADMIN MEDIA MANAGEMENT
// =======================================

@Controller('media')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles(
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_EDITOR',
)
export class MediaController {
  constructor(
    private readonly media: MediaService,
  ) {}

  @Get()
  findAll(@Query() query: unknown) {
    return this.media.findAll(
      validate(mediaListSchema, query),
    );
  }

  @Post('upload')
  @Throttle({
    short: { limit: 2, ttl: 10000 },
    medium: { limit: 10, ttl: 60000 },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        files: 1,
        fileSize: 25 * 1024 * 1024,
        fields: 5,
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: unknown,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Select a file to upload',
      );
    }

    const options = validate(
      mediaUploadSchema,
      body,
    );

    return this.media.uploadFile(
      file,
      options.appId,
      options.visibility,
    );
  }

  @Get(':id/access')
  async getAccess(
    @Param('id') rawId: string,
  ) {
    return this.media.getAdminAccess(
      validate(mediaIdSchema, rawId),
    );
  }

  @Delete(':id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  delete(
    @Param('id') rawId: string,
  ) {
    return this.media.deleteFile(
      validate(mediaIdSchema, rawId),
    );
  }
}
