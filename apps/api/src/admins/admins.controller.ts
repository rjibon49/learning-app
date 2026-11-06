import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminsService } from './admins.service.js';
import { CreateAdminSchema, UpdateAdminSchema } from './dto/admin.dto.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

@Controller('admins')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN') // Only Super Admin can manage other admins
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  async findAll() {
    return this.adminsService.findAllAdmins();
  }

  @Post()
  async create(@Body() raw: unknown) {
    return this.adminsService.createAdmin(CreateAdminSchema.parse(raw));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() raw: unknown) {
    return this.adminsService.updateAdmin(id, UpdateAdminSchema.parse(raw));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.adminsService.deleteAdmin(id);
  }
} 