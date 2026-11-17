
import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

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
import { PermanentDeleteService } from '../common/permanent-delete.service.js';
import { isPermanent, validate as parse } from '../common/validation.js';

@Controller('admins')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN')
export class AdminsController {
  constructor(
    private readonly admins: AdminsService,
    private readonly permanentDelete: PermanentDeleteService,
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

  /**
   * DELETE /admins/:id                -> deactivate (default, keeps audit history)
   * DELETE /admins/:id?permanent=true -> delete an admin that is ALREADY deactivated.
   *   Their audit-log rows stay (admin link becomes empty).
   */
  @Delete(':id')
  async deactivate(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id') rawId: string,
    @Query() query: unknown,
  ) {
    const actorId = this.actorId(admin);
    const id = parse(adminIdSchema, rawId);

    if (!isPermanent(query)) {
      return this.admins.deactivateAdmin(actorId, id);
    }

    if (actorId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    return this.permanentDelete.run(admin, 'AdminUser', id, async (tx) => {
      const target = await tx.adminUser.findUnique({
        where: { id },
        select: { isActive: true },
      });

      if (!target) {
        throw new NotFoundException('Admin not found');
      }

      if (target.isActive) {
        throw new ConflictException(
          'Deactivate this admin first, then delete permanently.',
        );
      }

      await tx.adminUser.delete({ where: { id }, select: { id: true } });
    });
  }
}
