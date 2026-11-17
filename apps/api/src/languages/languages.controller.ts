
import {
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

import { idSchema, isPermanent, validate } from '../common/validation.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';

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
    private readonly permanentDelete: PermanentDeleteService,
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

  /**
   * DELETE /admin/languages/:code                -> deactivate (hidden from apps/website)
   * DELETE /admin/languages/:code?permanent=true -> SUPER_ADMIN: delete. Refused (409)
   *   while any app, course, vocabulary or translation still uses the language.
   */
  @Delete(':code')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async remove(
    @Param('code') rawCode: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const code = validate(languageCodeSchema, rawCode);

    if (!isPermanent(query)) {
      return this.languages.update(code, { isActive: false });
    }

    const language = await this.languages.findByCodeOrThrow(code);

    return this.permanentDelete.run(admin, 'Language', language.id, (tx) =>
      tx.language.delete({ where: { id: language.id }, select: { id: true } }),
      { code },
    );
  }

  /**
   * DELETE /admin/languages/:code/levels/:levelId                -> disable this level for the language
   * DELETE /admin/languages/:code/levels/:levelId?permanent=true -> remove the assignment row
   */
  @Delete(':code/levels/:levelId')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  removeLevel(
    @Param('code') rawCode: string,
    @Param('levelId') rawLevelId: string,
    @Query() query: unknown,
  ) {
    return this.languages.removeLevel(
      validate(languageCodeSchema, rawCode),
      validate(idSchema, rawLevelId),
      isPermanent(query),
    );
  }
}
