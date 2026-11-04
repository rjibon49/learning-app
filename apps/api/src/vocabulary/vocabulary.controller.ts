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
import { ZodError } from 'zod';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRole } from '../generated/prisma/client.js';
import {
  createCategorySchema,
  createVocabularySchema,
  updateVocabularySchema,
} from './vocabulary.schemas.js';
import { VocabularyService } from './vocabulary.service.js';

const CONTENT_ROLES = [
  AdminRole.SUPER_ADMIN,
  AdminRole.ADMIN,
  AdminRole.CONTENT_EDITOR,
];

@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles(...CONTENT_ROLES)
  @Post('categories')
  createCategory(@Body() body: unknown) {
    try {
      return this.vocabularyService.createCategory(createCategorySchema.parse(body));
    } catch (error) {
      this.handleValidationError(error);
    }
  }

  @Get('categories')
  findCategories(@Query('appId') appId?: string) {
    return this.vocabularyService.findCategories(appId);
  }

  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles(...CONTENT_ROLES)
  @Get('admin')
  findAdmin(
    @Query('appId') appId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('published') published?: string,
  ) {
    let publishedValue: boolean | undefined;
    if (published === 'true') publishedValue = true;
    if (published === 'false') publishedValue = false;

    return this.vocabularyService.findAdmin({
      appId,
      categoryId,
      published: publishedValue,
    });
  }

  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles(...CONTENT_ROLES)
  @Post()
  createVocabulary(@Body() body: unknown) {
    try {
      return this.vocabularyService.createVocabulary(
        createVocabularySchema.parse(body),
      );
    } catch (error) {
      this.handleValidationError(error);
    }
  }

  @Get()
  findPublic(
    @Query('appId') appId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.vocabularyService.findPublic({ appId, categoryId });
  }

  @Get(':id')
  findPublicOne(@Param('id') id: string) {
    return this.vocabularyService.findPublicOne(id);
  }

  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles(...CONTENT_ROLES)
  @Patch(':id')
  updateVocabulary(@Param('id') id: string, @Body() body: unknown) {
    try {
      return this.vocabularyService.updateVocabulary(
        id,
        updateVocabularySchema.parse(body),
      );
    } catch (error) {
      this.handleValidationError(error);
    }
  }

  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @Delete(':id')
  deleteVocabulary(@Param('id') id: string) {
    return this.vocabularyService.deleteVocabulary(id);
  }

  private handleValidationError(error: unknown): never {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error.issues,
      });
    }
    throw error;
  }
}
