import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AdsService } from './ads.service.js';
import { CreateAdConfigSchema, UpdateAdConfigSchema } from './dto/ad-config.dto.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';

@Controller('ads')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get()
  async findAll(@Query('appId') appId?: string) {
    return this.adsService.findAllAdsConfigs(appId);
  }

  @Post()
  async create(@Body() raw: unknown) {
    return this.adsService.createAdConfig(CreateAdConfigSchema.parse(raw));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() raw: unknown) {
    return this.adsService.updateAdConfig(id, UpdateAdConfigSchema.parse(raw));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.adsService.deleteAdConfig(id);
  }
}