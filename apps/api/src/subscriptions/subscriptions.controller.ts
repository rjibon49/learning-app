import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { CreateSubscriptionSchema, UpdateSubscriptionSchema, CheckoutSubscriptionSchema } from './dto/subscription.dto.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  async findAll(@Query('appId') appId?: string) {
    return this.subscriptionsService.findAllSubscriptions(appId);
  }

  // 🚀 নতুন: চেকআউট এন্ডপয়েন্ট (প্রোমো কোডসহ)
  @Post('checkout')
  async checkout(@Body() raw: unknown) {
    return this.subscriptionsService.checkoutSubscription(CheckoutSubscriptionSchema.parse(raw));
  }

  @Post()
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  async create(@Body() raw: unknown) {
    return this.subscriptionsService.createSubscription(CreateSubscriptionSchema.parse(raw));
  }

  @Patch(':id')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  async update(@Param('id') id: string, @Body() raw: unknown) {
    return this.subscriptionsService.updateSubscription(id, UpdateSubscriptionSchema.parse(raw));
  }

  @Delete(':id')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.subscriptionsService.deleteSubscription(id);
  }
}