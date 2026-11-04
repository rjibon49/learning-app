import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';
import type { AdminLoginInput } from './admin-auth.schemas.js';
import type { AdminJwtPayload } from './admin-auth.types.js';
import type { AdminRole } from '../generated/prisma/client.js';

type RequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(input: AdminLoginInput, metadata: RequestMetadata) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: input.email },
    });

    if (!admin?.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await argon2.verify(admin.passwordHash, input.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.createTokenPair(
      { id: admin.id, email: admin.email, role: admin.role, authVersion: admin.authVersion },
      metadata,
    );

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    await this.writeAudit(admin.id, 'ADMIN_LOGIN', 'AdminUser', admin.id, metadata);

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: admin.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn,
    };
  }

  async refresh(rawRefreshToken: string, metadata: RequestMetadata) {
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const stored = await this.prisma.adminRefreshToken.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      await this.prisma.adminRefreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!stored.admin.isActive) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Admin account is unavailable');
    }

    await this.prisma.adminRefreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.createTokenPair(
      {
        id: stored.admin.id,
        email: stored.admin.email,
        role: stored.admin.role,
        authVersion: stored.admin.authVersion,
      },
      metadata,
      stored.familyId,
    );
  }

  async logout(rawRefreshToken?: string) {
    if (!rawRefreshToken) return { success: true };

    await this.prisma.adminRefreshToken.updateMany({
      where: {
        tokenHash: this.hashRefreshToken(rawRefreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  async logoutAll(adminId: string, metadata?: RequestMetadata) {
    await this.prisma.$transaction([
      this.prisma.adminRefreshToken.updateMany({
        where: { adminId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.adminUser.update({
        where: { id: adminId },
        data: { authVersion: { increment: 1 } },
      }),
    ]);

    await this.writeAudit(adminId, 'ADMIN_LOGOUT_ALL', 'AdminUser', adminId, metadata);
    return { success: true };
  }

  private async createTokenPair(
    admin: { id: string; email: string; role: AdminRole; authVersion: number },
    metadata: RequestMetadata,
    existingFamilyId?: string,
  ) {
    const ttl = this.config.getOrThrow<number>('ADMIN_ACCESS_TOKEN_TTL_SECONDS');
    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      ver: admin.authVersion,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('ADMIN_JWT_SECRET'),
      expiresIn: ttl,
      issuer: this.config.getOrThrow<string>('ADMIN_JWT_ISSUER'),
      audience: this.config.getOrThrow<string>('ADMIN_JWT_AUDIENCE'),
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenDays = this.config.getOrThrow<number>(
      'ADMIN_REFRESH_TOKEN_DAYS',
    );
    const expiresAt = new Date(
      Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.adminRefreshToken.create({
      data: {
        adminId: admin.id,
        tokenHash: this.hashRefreshToken(refreshToken),
        familyId: existingFamilyId ?? randomUUID(),
        expiresAt,
        ipAddress: metadata.ipAddress?.slice(0, 64) ?? null,
        userAgent: metadata.userAgent?.slice(0, 500) ?? null,
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: ttl,
    };
  }

  private hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.adminRefreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async writeAudit(
    adminId: string | null,
    action: string,
    entityType?: string,
    entityId?: string,
    metadata?: RequestMetadata,
  ) {
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        ipAddress: metadata?.ipAddress?.slice(0, 64) ?? null,
        userAgent: metadata?.userAgent?.slice(0, 500) ?? null,
      },
    });
  }
}
