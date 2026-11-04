import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AdminRole } from '../generated/prisma/client.js';
import { ADMIN_ROLES_KEY } from './admin-roles.decorator.js';
import type { AuthenticatedAdmin } from './admin-auth.types.js';

type AdminRequest = Request & {
  admin?: AuthenticatedAdmin;
};

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<AdminRequest>();
    const admin = request.admin;

    if (!admin) {
      throw new ForbiddenException('Admin identity unavailable');
    }

    if (!requiredRoles.includes(admin.role)) {
      throw new ForbiddenException('Insufficient admin permission');
    }

    return true;
  }
}
