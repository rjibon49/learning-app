
import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { AuditLogsService } from './audit-logs.service.js';
import { auditListSchema } from './audit-logs.schemas.js';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

@Controller('audit-logs')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN')
export class AuditLogsController {
  constructor(
    private readonly logs: AuditLogsService,
  ) {}

  @Get()
  findAll(@Query() query: unknown) {
    const result = auditListSchema.safeParse(query);

    if (!result.success) {
      throw new BadRequestException(
        z.flattenError(result.error),
      );
    }

    return this.logs.findAllLogs(result.data);
  }
}
