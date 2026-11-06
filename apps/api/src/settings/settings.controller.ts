import { Controller, Get, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

@Controller('settings')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN') // Only Super Admins can access settings
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Put(':key')
  async updateSetting(
    @Param('key') key: string,
    @Body('value') value: string,
    @Body('description') description?: string,
  ) {
    return this.settingsService.updateSetting(key, value, description);
  }

  @Delete(':key')
  async deleteSetting(@Param('key') key: string) {
    return this.settingsService.deleteSetting(key);
  }
}