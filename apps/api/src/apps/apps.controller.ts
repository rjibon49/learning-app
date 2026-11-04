import { Controller, Get, Param } from '@nestjs/common';

import { AppsService } from './apps.service.js';

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  findAll() {
    return this.appsService.findAll();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.appsService.findBySlug(slug);
  }
}