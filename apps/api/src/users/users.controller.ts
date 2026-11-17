import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';
import { idSchema, isPermanent, validate } from '../common/validation.js';
import { UsersService } from './users.service.js';

const listQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(100).optional(),
    isActive: z.enum(['true', 'false']).optional().transform((v) =>
      v === undefined ? undefined : v === 'true',
    ),
    skip: z.coerce.number().int().min(0).default(0),
    take: z.coerce.number().int().min(1).max(500).default(100),
  })
  .strict();

const statusSchema = z.object({ isActive: z.boolean() }).strict();

/** Admin: learner (app user) management. */
@Controller('users')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly permanentDelete: PermanentDeleteService,
  ) {}

  @Get()
  findAll(@Query() query: unknown) {
    return this.users.findAllUsers(validate(listQuerySchema, query));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(validate(idSchema, id));
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() body: unknown) {
    return this.users.setStatus(
      validate(idSchema, id),
      validate(statusSchema, body).isActive,
    );
  }

  /**
   * DELETE /users/:id                 -> block the learner (isActive=false, logout everywhere)
   * DELETE /users/:id?permanent=true  -> SUPER_ADMIN: delete account + personal data
   */
  @Delete(':id')
  async remove(
    @Param('id') rawId: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const id = validate(idSchema, rawId);

    if (!isPermanent(query)) {
      await this.users.setStatus(id, false);
      return { success: true, permanent: false };
    }

    const actor = this.permanentDelete.assertAllowed(admin);
    const result = await this.users.deleteLearnerAccount(id);

    await this.permanentDelete.record(actor, 'User', id, { mode: result.mode });

    return { ...result, permanent: true };
  }
}
