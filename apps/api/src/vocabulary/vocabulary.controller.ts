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
} from '@nestjs/common';

import { ZodError } from 'zod';

import {
  createCategorySchema,
  createVocabularySchema,
  updateVocabularySchema,
} from './vocabulary.schemas.js';

import { VocabularyService } from './vocabulary.service.js';

@Controller('vocabulary')
export class VocabularyController {
  constructor(
    private readonly vocabularyService: VocabularyService,
  ) {}

  @Post('categories')
  createCategory(@Body() body: unknown) {
    try {
      const data =
        createCategorySchema.parse(body);

      return this.vocabularyService.createCategory(
        data,
      );
    } catch (error) {
      this.handleValidationError(error);
    }
  }

  @Get('categories')
  findCategories(
    @Query('appId') appId?: string,
  ) {
    return this.vocabularyService.findCategories(
      appId,
    );
  }

  @Post()
  createVocabulary(@Body() body: unknown) {
    try {
      const data =
        createVocabularySchema.parse(body);

      return this.vocabularyService.createVocabulary(
        data,
      );
    } catch (error) {
      this.handleValidationError(error);
    }
  }

  @Get()
  findAll(
    @Query('appId') appId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('published') published?: string,
  ) {
    let publishedValue:
      | boolean
      | undefined;

    if (published === 'true') {
      publishedValue = true;
    }

    if (published === 'false') {
      publishedValue = false;
    }

    return this.vocabularyService.findAll({
      appId,
      categoryId,
      published: publishedValue,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vocabularyService.findOne(id);
  }

  @Patch(':id')
  updateVocabulary(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    try {
      const data =
        updateVocabularySchema.parse(body);

      return this.vocabularyService.updateVocabulary(
        id,
        data,
      );
    } catch (error) {
      this.handleValidationError(error);
    }
  }

  @Delete(':id')
  deleteVocabulary(
    @Param('id') id: string,
  ) {
    return this.vocabularyService.deleteVocabulary(
      id,
    );
  }

  private handleValidationError(
    error: unknown,
  ): never {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error.issues,
      });
    }

    throw error;
  }
}