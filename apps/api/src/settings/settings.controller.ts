
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { SettingsService } from './settings.service.js';
import { DEFAULT_PRIVACY_MD, DEFAULT_TERMS_MD } from '../legal/legal.pages.js';
import {
  settingKeySchema,
  updateSettingSchema,
} from './settings.schemas.js';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';

import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';

function parse<T extends z.ZodType>(
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

@Controller('settings')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
  ) {}

  private actor(admin: AuthenticatedAdmin): string {
    if (!admin?.id) {
      throw new UnauthorizedException();
    }
    return admin.id;
  }

  @Get()
  getAll() {
    return this.settings.getAllSettings();
  }

  /** Built-in legal texts, so the CMS can start editing from them. */
  @Get('legal-defaults')
  legalDefaults() {
    return {
      privacy: DEFAULT_PRIVACY_MD,
      terms: DEFAULT_TERMS_MD,
      placeholders: ['{{company}}', '{{email}}', '{{website}}', '{{address}}', '{{app}}', '{{updated}}'],
    };
  }

  @Put(':key')
  update(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('key') rawKey: string,
    @Body() body: unknown,
  ) {
    return this.settings.updateSetting(
      this.actor(admin),
      parse(settingKeySchema, rawKey),
      parse(updateSettingSchema, body),
    );
  }

  @Delete(':key')
  remove(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('key') rawKey: string,
  ) {
    return this.settings.deleteSetting(
      this.actor(admin),
      parse(settingKeySchema, rawKey),
    );
  }
}

@Controller('settings/public')
export class PublicSettingsController {
  constructor(
    private readonly settings: SettingsService,
  ) {}

  @Get()
  getPublic() {
    return this.settings.getPublicSettings();
  }
}
