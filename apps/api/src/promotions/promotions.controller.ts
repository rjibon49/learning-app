import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PromotionsService } from './promotions.service.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // --- Public / App Endpoints ---
  @Post('referral/apply')
  async applyReferral(@Body() body: { userId: string, code: string }) {
    return this.promotionsService.applyReferralCode(body.userId, body.code);
  }

  @Get('code/:code')
  async checkPromoCode(@Param('code') code: string) {
    return this.promotionsService.validatePromoCode(code);
  }

  // --- Admin CRUD Endpoints ---
  
  // Read
  @Get('admin/codes')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async getAllPromoCodes() {
    return this.promotionsService.getAllPromoCodes();
  }

  // Create
  @Post('admin/codes')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async createPromoCode(@Body() data: any) {
    return this.promotionsService.createPromoCode(data);
  }

  // Update Full
  @Patch('admin/codes/:id')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async updatePromoCode(@Param('id') id: string, @Body() data: any) {
    return this.promotionsService.updatePromoCode(id, data);
  }

  // Update Status
  @Patch('admin/codes/:id/status')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async togglePromoCode(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.promotionsService.togglePromoCode(id, isActive);
  }

  // Delete
  @Delete('admin/codes/:id')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async deletePromoCode(@Param('id') id: string) {
    return this.promotionsService.deletePromoCode(id);
  }
}