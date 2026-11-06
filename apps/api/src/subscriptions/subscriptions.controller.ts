import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { CreateSubscriptionSchema, UpdateSubscriptionSchema } from './dto/subscription.dto.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';

@Controller('subscriptions')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  async findAll(@Query('appId') appId?: string) {
    return this.subscriptionsService.findAllSubscriptions(appId);
  }

  @Post()
  async create(@Body() raw: unknown) {
    return this.subscriptionsService.createSubscription(CreateSubscriptionSchema.parse(raw));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() raw: unknown) {
    return this.subscriptionsService.updateSubscription(id, UpdateSubscriptionSchema.parse(raw));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.subscriptionsService.deleteSubscription(id);
  }
}