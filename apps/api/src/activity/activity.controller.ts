import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // User Actions (Mobile App/Web Client)
  @Post('log')
  async logActivity(@Body() body: { userId: string, durationMinutes: number }) {
    return this.activityService.logDailyActivity(body.userId, body.durationMinutes);
  }

  @Get('user/:userId')
  async getUserActivities(@Param('userId') userId: string) {
    return this.activityService.getUserActivities(userId);
  }

  // Admin Actions
  @Get('admin')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async getAllActivitiesAdmin() {
    return this.activityService.getAllActivities();
  }

  @Patch('admin/:id')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async updateActivityAdmin(@Param('id') id: string, @Body('durationMinutes') durationMinutes: number) {
    return this.activityService.updateActivityLog(id, durationMinutes);
  }

  @Delete('admin/:id')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async deleteActivityAdmin(@Param('id') id: string) {
    return this.activityService.deleteActivityLog(id);
  }
}