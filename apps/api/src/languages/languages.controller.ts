
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { z } from 'zod';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

import { LanguagesService } from './languages.service.js';

import {
  languageCodeSchema,
  createLanguageSchema,
  updateLanguageSchema,
  assignLevelsSchema,
} from './languages.schemas.js';

function validate<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }

  return result.data;
}

// ==========================================
// Public language catalog
// ==========================================

@Controller('languages')
export class PublicLanguagesController {
  constructor(
    private readonly languages: LanguagesService,
  ) {}

  @Get()
  findAll() {
    return this.languages.findAll();
  }

  @Get(':code/levels')
  findLevels(@Param('code') rawCode: string) {
    const code = validate(
      languageCodeSchema,
      rawCode,
    );

    return this.languages.findLevels(code);
  }
}

// ==========================================
// Protected Admin Language Manager
// ==========================================

@Controller('admin/languages')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
export class AdminLanguagesController {
  constructor(
    private readonly languages: LanguagesService,
  ) {}

  @Get()
  findAll() {
    return this.languages.findAllAdmin();
  }

  @Get('frameworks')
  frameworks() {
    return this.languages.findFrameworks();
  }

  @Get(':code/levels')
  findLevels(@Param('code') rawCode: string) {
    return this.languages.findLevelsAdmin(
      validate(languageCodeSchema, rawCode),
    );
  }

  @Post()
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  create(@Body() body: unknown) {
    return this.languages.create(
      validate(createLanguageSchema, body),
    );
  }

  @Patch(':code')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  update(
    @Param('code') rawCode: string,
    @Body() body: unknown,
  ) {
    return this.languages.update(
      validate(languageCodeSchema, rawCode),
      validate(updateLanguageSchema, body),
    );
  }

  @Post(':code/levels')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  assignLevels(
    @Param('code') rawCode: string,
    @Body() body: unknown,
  ) {
    return this.languages.assignLevels(
      validate(languageCodeSchema, rawCode),
      validate(assignLevelsSchema, body),
    );
  }
}
