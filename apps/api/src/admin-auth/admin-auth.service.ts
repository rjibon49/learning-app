
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import * as argon2 from 'argon2';

import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from 'node:crypto';

import { PrismaService } from '../prisma.service.js';

import type { AdminRole } from '../generated/prisma/client.js';

import type { AdminLoginInput } from './admin-auth.schemas.js';

import type {
  AdminJwtPayload,
  AdminRequestMetadata,
} from './admin-auth.types.js';

type AdminIdentity = {
  id: string;
  email: string;
  role: AdminRole;
  authVersion: number;
};

@Injectable()
export class AdminAuthService {
  private readonly accessTokenSeconds: number;
  private readonly refreshTokenDays: number;

  private readonly jwtSecret: string;
  private readonly jwtIssuer: string;
  private readonly jwtAudience: string;

  private readonly loginWindowMs = 15 * 60 * 1000;
  private readonly maxFailedLogins = 8;

  private dummyPasswordHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.jwtSecret =
      this.config.getOrThrow<string>(
        'ADMIN_JWT_SECRET',
      );

    this.jwtIssuer =
      this.config.getOrThrow<string>(
        'ADMIN_JWT_ISSUER',
      );

    this.jwtAudience =
      this.config.getOrThrow<string>(
        'ADMIN_JWT_AUDIENCE',
      );

    this.accessTokenSeconds = Number(
      this.config.getOrThrow<number>(
        'ADMIN_ACCESS_TOKEN_TTL_SECONDS',
      ),
    );

    this.refreshTokenDays = Number(
      this.config.getOrThrow<number>(
        'ADMIN_REFRESH_TOKEN_DAYS',
      ),
    );

    if (this.jwtSecret.length < 32) {
      throw new Error(
        'ADMIN_JWT_SECRET must contain at least 32 characters',
      );
    }

    if (
      !Number.isInteger(this.accessTokenSeconds) ||
      this.accessTokenSeconds < 300 ||
      this.accessTokenSeconds > 3600
    ) {
      throw new Error(
        'Invalid ADMIN_ACCESS_TOKEN_TTL_SECONDS',
      );
    }

    if (
      !Number.isInteger(this.refreshTokenDays) ||
      this.refreshTokenDays < 1 ||
      this.refreshTokenDays > 90
    ) {
      throw new Error(
        'Invalid ADMIN_REFRESH_TOKEN_DAYS',
      );
    }
  }

  // ==========================================
  // SECURITY HELPERS
  // ==========================================

  private hashRefreshToken(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  private newRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private loginIdentityHash(email: string): string {
    return createHmac(
      'sha256',
      this.jwtSecret,
    )
      .update(email)
      .digest('hex');
  }

  private async verifyPassword(
    storedHash: string,
    password: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(
        storedHash,
        password,
      );
    } catch {
      return false;
    }
  }

  private async verifyDummyPassword(
    password: string,
  ): Promise<void> {
    this.dummyPasswordHash ??= argon2.hash(
      'invalid-admin-placeholder-password',
      {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      },
    );

    const hash = await this.dummyPasswordHash;

    await argon2.verify(hash, password);
  }

  private async createAccessToken(
    admin: AdminIdentity,
  ): Promise<string> {
    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      ver: admin.authVersion,
      typ: 'admin',
    };

    return this.jwtService.signAsync(
      payload,
      {
        secret: this.jwtSecret,
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
        algorithm: 'HS256',
        expiresIn: this.accessTokenSeconds,
      },
    );
  }

  private refreshExpiry(): Date {
    return new Date(
      Date.now() +
        this.refreshTokenDays *
          24 * 60 * 60 * 1000,
    );
  }

  // ==========================================
  // LOGIN ATTEMPT PROTECTION
  // ==========================================

  private async checkLoginLimit(
    email: string,
    lastLoginAt: Date | null,
  ): Promise<void> {
    const windowStart = new Date(
      Date.now() - this.loginWindowMs,
    );

    const since =
      lastLoginAt &&
      lastLoginAt > windowStart
        ? lastLoginAt
        : windowStart;

    const failures =
      await this.prisma.adminAuditLog.count({
        where: {
          action: 'ADMIN_LOGIN_FAILED',
          entityType: 'AdminLogin',
          entityId: this.loginIdentityHash(email),
          createdAt: {
            gte: since,
          },
        },
      });

    if (failures >= this.maxFailedLogins) {
      throw new HttpException(
        'Too many login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordFailedLogin(
    email: string,
    metadata: AdminRequestMetadata,
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        adminId: null,
        action: 'ADMIN_LOGIN_FAILED',
        entityType: 'AdminLogin',

        // Do not store the email or password here.
        entityId: this.loginIdentityHash(email),

        ipAddress:
          metadata.ipAddress?.slice(0, 64) ?? null,

        userAgent:
          metadata.userAgent?.slice(0, 500) ?? null,
      },
    });
  }

  private async writeAudit(
    adminId: string | null,
    action: string,
    metadata?: AdminRequestMetadata,
    entityId?: string,
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entityType: 'AdminUser',
        entityId: entityId ?? adminId,

        ipAddress:
          metadata?.ipAddress?.slice(0, 64) ?? null,

        userAgent:
          metadata?.userAgent?.slice(0, 500) ?? null,
      },
    });
  }

  // ==========================================
  // ADMIN LOGIN
  // ==========================================

  async login(
    input: AdminLoginInput,
    metadata: AdminRequestMetadata,
  ) {
    const admin =
      await this.prisma.adminUser.findUnique({
        where: {
          email: input.email,
        },
      });

    await this.checkLoginLimit(
      input.email,
      admin?.lastLoginAt ?? null,
    );

    let validPassword = false;

    if (admin?.isActive) {
      validPassword = await this.verifyPassword(
        admin.passwordHash,
        input.password,
      );
    } else {
      // Avoid a very different password-verification
      // execution path for nonexistent accounts.
      await this.verifyDummyPassword(
        input.password,
      );
    }

    if (!admin?.isActive || !validPassword) {
      await this.recordFailedLogin(
        input.email,
        metadata,
      );

      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const identity: AdminIdentity = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      authVersion: admin.authVersion,
    };

    const accessToken =
      await this.createAccessToken(identity);

    const refreshToken =
      this.newRefreshToken();

    const familyId = randomUUID();

    const now = new Date();

    await this.prisma.$transaction(
      async (tx) => {
        // Prevent issuing a session after an account
        // was concurrently disabled or changed.
        const current =
          await tx.adminUser.findUnique({
            where: { id: admin.id },
            select: {
              isActive: true,
              authVersion: true,
            },
          });

        if (
          !current?.isActive ||
          current.authVersion !== admin.authVersion
        ) {
          throw new UnauthorizedException(
            'Administrator account changed',
          );
        }

        await tx.adminRefreshToken.create({
          data: {
            adminId: admin.id,

            tokenHash:
              this.hashRefreshToken(refreshToken),

            familyId,
            expiresAt: this.refreshExpiry(),

            ipAddress:
              metadata.ipAddress?.slice(0, 64) ??
              null,

            userAgent:
              metadata.userAgent?.slice(0, 500) ??
              null,
          },
        });

        await tx.adminUser.update({
          where: { id: admin.id },
          data: {
            lastLoginAt: now,
          },
        });

        await tx.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'ADMIN_LOGIN',
            entityType: 'AdminUser',
            entityId: admin.id,
            ipAddress:
              metadata.ipAddress?.slice(0, 64) ??
              null,
            userAgent:
              metadata.userAgent?.slice(0, 500) ??
              null,
          },
        });
      },
    );

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: admin.role,
      },

      accessToken,
      refreshToken,

      accessTokenExpiresIn:
        this.accessTokenSeconds,
    };
  }

  // ==========================================
  // REFRESH TOKEN ROTATION
  // ==========================================

  async refresh(
    rawRefreshToken: string,
    metadata: AdminRequestMetadata,
  ) {
    if (
      !rawRefreshToken ||
      rawRefreshToken.length > 256
    ) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    const tokenHash =
      this.hashRefreshToken(rawRefreshToken);

    const stored =
      await this.prisma.adminRefreshToken.findUnique({
        where: { tokenHash },
        include: {
          admin: true,
        },
      });

    if (!stored) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);

      await this.writeAudit(
        stored.adminId,
        'ADMIN_REFRESH_REUSE_DETECTED',
        metadata,
      );

      throw new UnauthorizedException(
        'Refresh token reuse detected',
      );
    }

    if (
      stored.expiresAt <= new Date() ||
      !stored.admin.isActive
    ) {
      await this.revokeFamily(stored.familyId);

      throw new UnauthorizedException(
        'Refresh session unavailable',
      );
    }

    const admin = stored.admin;

    const accessToken =
      await this.createAccessToken({
        id: admin.id,
        email: admin.email,
        role: admin.role,
        authVersion: admin.authVersion,
      });

    const newRefreshToken =
      this.newRefreshToken();

    const now = new Date();

    let rotated = false;

    await this.prisma.$transaction(
      async (tx) => {
        const currentAdmin =
          await tx.adminUser.findUnique({
            where: { id: admin.id },
            select: {
              isActive: true,
              authVersion: true,
            },
          });

        if (
          !currentAdmin?.isActive ||
          currentAdmin.authVersion !==
            admin.authVersion
        ) {
          throw new UnauthorizedException(
            'Admin session is no longer valid',
          );
        }

        const consumed =
          await tx.adminRefreshToken.updateMany({
            where: {
              id: stored.id,
              revokedAt: null,
              expiresAt: { gt: now },
            },

            data: {
              revokedAt: now,
            },
          });

        if (consumed.count !== 1) {
          return;
        }

        await tx.adminRefreshToken.create({
          data: {
            adminId: admin.id,

            tokenHash:
              this.hashRefreshToken(
                newRefreshToken,
              ),

            familyId: stored.familyId,
            expiresAt: this.refreshExpiry(),

            ipAddress:
              metadata.ipAddress?.slice(0, 64) ??
              null,

            userAgent:
              metadata.userAgent?.slice(0, 500) ??
              null,
          },
        });

        rotated = true;
      },
    );

    if (!rotated) {
      // A simultaneous request may already have
      // consumed this token.
      await this.revokeFamily(stored.familyId);

      await this.writeAudit(
        stored.adminId,
        'ADMIN_REFRESH_REUSE_DETECTED',
        metadata,
      );

      throw new UnauthorizedException(
        'Refresh token already used',
      );
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,

      accessTokenExpiresIn:
        this.accessTokenSeconds,
    };
  }

  // ==========================================
  // LOGOUT CURRENT SESSION
  // ==========================================

  async logout(rawRefreshToken?: string) {
    if (!rawRefreshToken) {
      return { success: true };
    }

    await this.prisma.adminRefreshToken.updateMany({
      where: {
        tokenHash:
          this.hashRefreshToken(rawRefreshToken),
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });

    return {
      success: true,
    };
  }

  // ==========================================
  // LOGOUT ALL SESSIONS
  // ==========================================

  async logoutAll(
    adminId: string,
    metadata?: AdminRequestMetadata,
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        const now = new Date();

        await tx.adminRefreshToken.updateMany({
          where: {
            adminId,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

        await tx.adminUser.update({
          where: {
            id: adminId,
          },
          data: {
            authVersion: {
              increment: 1,
            },
          },
        });

        await tx.adminAuditLog.create({
          data: {
            adminId,
            action: 'ADMIN_LOGOUT_ALL',
            entityType: 'AdminUser',
            entityId: adminId,

            ipAddress:
              metadata?.ipAddress?.slice(0, 64) ??
              null,

            userAgent:
              metadata?.userAgent?.slice(0, 500) ??
              null,
          },
        });
      },
    );

    return {
      success: true,
    };
  }

  private async revokeFamily(
    familyId: string,
  ): Promise<void> {
    await this.prisma.adminRefreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
