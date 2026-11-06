import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

@Controller('audit-logs')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN') // Only Super Admin can view audit logs
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(@Query('limit') limit?: string) {
    return this.auditLogsService.findAllLogs(limit ? parseInt(limit, 10) : 50);
  }
}