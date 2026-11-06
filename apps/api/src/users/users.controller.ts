import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

@Controller('users')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async getAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Patch(':id/status')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async toggleUserStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.usersService.toggleUserStatus(id, isActive);
  }
}