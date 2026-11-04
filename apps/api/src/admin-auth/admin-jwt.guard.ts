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
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Admin authentication required');
    }

    const token = authorization.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Admin authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AdminJwtPayload>(token, {
        secret: this.config.getOrThrow<string>('ADMIN_JWT_SECRET'),
        issuer: this.config.getOrThrow<string>('ADMIN_JWT_ISSUER'),
        audience: this.config.getOrThrow<string>('ADMIN_JWT_AUDIENCE'),
      });

      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          authVersion: true,
        },
      });

      if (!admin?.isActive || admin.authVersion !== payload.ver) {
        throw new UnauthorizedException('Admin account is unavailable');
      }

      request.admin = {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: admin.role,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
