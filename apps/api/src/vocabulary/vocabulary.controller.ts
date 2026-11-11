
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { z } from 'zod';

import {
  AdminRole,
} from '../generated/prisma/client.js';

import { AdminJwtGuard } from
  '../admin-auth/admin-jwt.guard.js';

import { AdminRolesGuard } from
  '../admin-auth/admin-roles.guard.js';

import { AdminRoles } from
  '../admin-auth/admin-roles.decorator.js';

import { VocabularyService } from './vocabulary.service.js';

import {
  vocabularyIdSchema,
  createCategorySchema,
  updateCategorySchema,
  categoryTranslationSchema,
  createVocabularySchema,
  updateVocabularySchema,
  vocabularyTranslationSchema,
  vocabularyExampleSchema,
  updateVocabularyExampleSchema,
  vocabularyListQuerySchema,
} from './vocabulary.schemas.js';

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

const CONTENT_ROLES = [
  AdminRole.SUPER_ADMIN,
  AdminRole.ADMIN,
  AdminRole.CONTENT_EDITOR,
];

// ==========================================
// PUBLIC VOCABULARY API
// ==========================================

@Controller('vocabulary')
export class VocabularyController {
  constructor(
    private readonly service: VocabularyService,
  ) {}

  @Get('categories')
  categories() {
    return this.service.findCategories(false);
  }

  @Get()
  findAll(@Query() query: unknown) {
    return this.service.findPublic(
      validate(vocabularyListQuerySchema, query),
    );
  }

  @Get(':id')
  findOne(@Param('id') rawId: string) {
    return this.service.findPublicOne(
      validate(vocabularyIdSchema, rawId),
    );
  }
}

// ==========================================
// ADMIN VOCABULARY API
// ==========================================

@Controller('admin/vocabulary')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles(...CONTENT_ROLES)
export class AdminVocabularyController {
  constructor(
    private readonly service: VocabularyService,
  ) {}

  // Categories

  @Get('categories')
  findCategories() {
    return this.service.findCategories(true);
  }

  @Post('categories')
  createCategory(@Body() body: unknown) {
    return this.service.createCategory(
      validate(createCategorySchema, body),
    );
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.service.updateCategory(
      validate(vocabularyIdSchema, rawId),
      validate(updateCategorySchema, body),
    );
  }

  @Delete('categories/:id')
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.ADMIN,
  )
  deleteCategory(@Param('id') rawId: string) {
    return this.service.deleteCategory(
      validate(vocabularyIdSchema, rawId),
    );
  }

  @Post('categories/:id/translations')
  saveCategoryTranslation(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.service.saveCategoryTranslation(
      validate(vocabularyIdSchema, rawId),
      validate(categoryTranslationSchema, body),
    );
  }

  @Delete('categories/:id/translations/:languageId')
  removeCategoryTranslation(
    @Param('id') rawId: string,
    @Param('languageId') rawLanguageId: string,
  ) {
    return this.service.removeCategoryTranslation(
      validate(vocabularyIdSchema, rawId),
      validate(vocabularyIdSchema, rawLanguageId),
    );
  }

  // Vocabulary listing

  @Get()
  findAll(@Query() query: unknown) {
    return this.service.findAdmin(
      validate(vocabularyListQuerySchema, query),
    );
  }

  @Get(':id')
  findOne(@Param('id') rawId: string) {
    return this.service.findOneForAdmin(
      validate(vocabularyIdSchema, rawId),
    );
  }

  @Post()
  create(@Body() body: unknown) {
    return this.service.createVocabulary(
      validate(createVocabularySchema, body),
    );
  }

  @Patch(':id')
  update(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.service.updateVocabulary(
      validate(vocabularyIdSchema, rawId),
      validate(updateVocabularySchema, body),
    );
  }

  @Delete(':id')
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.ADMIN,
  )
  archive(@Param('id') rawId: string) {
    return this.service.deleteVocabulary(
      validate(vocabularyIdSchema, rawId),
    );
  }

  // Translations

  @Post(':id/translations')
  addTranslation(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.service.addTranslation(
      validate(vocabularyIdSchema, rawId),
      validate(vocabularyTranslationSchema, body),
    );
  }

  @Patch(':id/translations/:translationId')
  updateTranslation(
    @Param('id') rawId: string,
    @Param('translationId') rawTranslationId: string,
    @Body() body: unknown,
  ) {
    return this.service.updateTranslation(
      validate(vocabularyIdSchema, rawId),
      validate(vocabularyIdSchema, rawTranslationId),
      validate(vocabularyTranslationSchema, body),
    );
  }

  @Delete(':id/translations/:translationId')
  removeTranslation(
    @Param('id') rawId: string,
    @Param('translationId') rawTranslationId: string,
  ) {
    return this.service.removeTranslation(
      validate(vocabularyIdSchema, rawId),
      validate(vocabularyIdSchema, rawTranslationId),
    );
  }

  // Example sentences

  @Post(':id/examples')
  addExample(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.service.addExample(
      validate(vocabularyIdSchema, rawId),
      validate(vocabularyExampleSchema, body),
    );
  }

  @Patch(':id/examples/:exampleId')
  updateExample(
    @Param('id') rawId: string,
    @Param('exampleId') rawExampleId: string,
    @Body() body: unknown,
  ) {
    return this.service.updateExample(
      validate(vocabularyIdSchema, rawId),
      validate(vocabularyIdSchema, rawExampleId),
      validate(updateVocabularyExampleSchema, body),
    );
  }

  @Delete(':id/examples/:exampleId')
  removeExample(
    @Param('id') rawId: string,
    @Param('exampleId') rawExampleId: string,
  ) {
    return this.service.removeExample(
      validate(vocabularyIdSchema, rawId),
      validate(vocabularyIdSchema, rawExampleId),
    );
  }
}
