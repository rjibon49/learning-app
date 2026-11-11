
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { Request } from 'express';

import { PrismaService } from '../prisma.service.js';

import type {
  AdminJwtPayload,
  AuthenticatedAdmin,
} from './admin-auth.types.js';

type AdminRequest = Request & {
  admin?: AuthenticatedAdmin;
};

@Injectable()
export class AdminJwtGuard
  implements CanActivate
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AdminRequest>();

    const authorization =
      request.headers.authorization;

    if (
      typeof authorization !== 'string' ||
      !/^Bearer\s+\S+$/i.test(authorization)
    ) {
      throw new UnauthorizedException(
        'Admin authentication required',
      );
    }

    const token =
      authorization.replace(
        /^Bearer\s+/i,
        '',
      );

    if (
      !token ||
      token.length > 8192
    ) {
      throw new UnauthorizedException(
        'Invalid access token',
      );
    }

    let payload: AdminJwtPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<AdminJwtPayload>(
          token,
          {
            secret:
              this.config.getOrThrow<string>(
                'ADMIN_JWT_SECRET',
              ),

            issuer:
              this.config.getOrThrow<string>(
                'ADMIN_JWT_ISSUER',
              ),

            audience:
              this.config.getOrThrow<string>(
                'ADMIN_JWT_AUDIENCE',
              ),

            algorithms: ['HS256'],
          },
        );
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired access token',
      );
    }

    // ======================================
    // Strict JWT Payload Validation
    // ======================================

    if (
      !payload ||
      typeof payload !== 'object' ||
      payload.typ !== 'admin' ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.ver !== 'number' ||
      !Number.isInteger(payload.ver)
    ) {
      throw new UnauthorizedException(
        'Invalid admin token payload',
      );
    }

    // ======================================
    // Current Database Identity
    // ======================================

    const admin =
      await this.prisma.adminUser.findUnique({
        where: {
          id: payload.sub,
        },

        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          authVersion: true,
        },
      });

    if (
      !admin ||
      !admin.isActive ||
      admin.authVersion !== payload.ver ||
      admin.email !== payload.email ||
      admin.role !== payload.role
    ) {
      throw new UnauthorizedException(
        'Admin session is no longer valid',
      );
    }

    request.admin = {
      id: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      role: admin.role,
    };

    return true;
  }
}
