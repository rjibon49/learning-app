
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { z } from 'zod';

import { AdminsService } from './admins.service.js';

import {
  CreateAdminSchema,
  UpdateAdminSchema,
  adminIdSchema,
  adminListSchema,
} from './dto/admin.dto.js';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';

import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';

function parse<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.output<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }

  return result.data;
}

@Controller('admins')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN')
export class AdminsController {
  constructor(
    private readonly admins: AdminsService,
  ) {}

  private actorId(admin?: AuthenticatedAdmin): string {
    if (!admin?.id) {
      throw new UnauthorizedException();
    }
    return admin.id;
  }

  @Get()
  findAll(@Query() query: unknown) {
    return this.admins.findAllAdmins(
      parse(adminListSchema, query),
    );
  }

  @Post()
  create(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Body() body: unknown,
  ) {
    return this.admins.createAdmin(
      this.actorId(admin),
      parse(CreateAdminSchema, body),
    );
  }

  @Patch(':id')
  update(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.admins.updateAdmin(
      this.actorId(admin),
      parse(adminIdSchema, rawId),
      parse(UpdateAdminSchema, body),
    );
  }

  @Delete(':id')
  deactivate(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') rawId: string,
  ) {
    return this.admins.deactivateAdmin(
      this.actorId(admin),
      parse(adminIdSchema, rawId),
    );
  }
}
