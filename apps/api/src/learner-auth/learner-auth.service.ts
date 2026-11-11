
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import * as argon2 from 'argon2';

import {
  createHash,
  randomBytes,
} from 'node:crypto';

import { PrismaService } from '../prisma.service.js';
import { PasswordResetMailService } from './password-reset-mail.service.js';

import type {
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './learner-auth.schemas.js';

type SessionMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AccessPayload = {
  sub: string;
  typ: 'learner';
};

@Injectable()
export class LearnerAuthService {
  private readonly jwtSecret: string;

  private readonly issuer = 'learning-api';
  private readonly audience = 'learning-learner';

  private readonly refreshDays = 7;
  private readonly accessSeconds = 900;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly resetMail: PasswordResetMailService,
  ) {
    this.jwtSecret =
      this.config.getOrThrow<string>(
        'LEARNER_JWT_SECRET',
      );

    if (this.jwtSecret.length < 32) {
      throw new Error(
        'LEARNER_JWT_SECRET must be at least 32 characters',
      );
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  private newToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async signAccessToken(
    userId: string,
  ): Promise<string> {
    const payload: AccessPayload = {
      sub: userId,
      typ: 'learner',
    };

    return this.jwt.signAsync(payload, {
      secret: this.jwtSecret,
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: this.accessSeconds,
      algorithm: 'HS256',
    });
  }

  private async issueTokens(
    userId: string,
    metadata: SessionMetadata,
  ) {
    const refreshToken = this.newToken();

    const expiresAt = new Date(
      Date.now() +
        this.refreshDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.userSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        ipAddress: metadata.ipAddress?.slice(0, 64),
        userAgent: metadata.userAgent?.slice(0, 500),
      },
    });

    return {
      accessToken: await this.signAccessToken(userId),
      refreshToken,
      expiresIn: this.accessSeconds,
    };
  }

  // =========================================
  // LOGIN
  // =========================================

  async login(
    input: LoginInput,
    metadata: SessionMetadata,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: input.email,
      },
    });

    const invalidMessage =
      'Invalid email or password';

    if (
      !user ||
      !user.passwordHash ||
      !user.isActive
    ) {
      throw new UnauthorizedException(
        invalidMessage,
      );
    }

    const valid = await argon2.verify(
      user.passwordHash,
      input.password,
    );

    if (!valid) {
      throw new UnauthorizedException(
        invalidMessage,
      );
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    const tokens = await this.issueTokens(
      user.id,
      metadata,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: true,
      },
      ...tokens,
    };
  }

  // =========================================
  // REFRESH TOKEN ROTATION
  // =========================================

  async refresh(
    rawToken: string,
    metadata: SessionMetadata,
  ) {
    const tokenHash = this.hashToken(rawToken);

    const existing =
      await this.prisma.userSession.findUnique({
        where: { tokenHash },
        include: {
          user: true,
        },
      });

    if (!existing) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    if (existing.revokedAt) {
      // A previously rotated token was presented.
      // Invalidate the user's active sessions.
      await this.prisma.userSession.updateMany({
        where: {
          userId: existing.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      throw new UnauthorizedException(
        'Refresh token reuse detected',
      );
    }

    if (
      existing.expiresAt <= new Date() ||
      !existing.user.isActive ||
      !existing.user.emailVerifiedAt
    ) {
      throw new UnauthorizedException(
        'Refresh session expired or unavailable',
      );
    }

    const newRefreshToken = this.newToken();
    const now = new Date();

    const newExpiry = new Date(
      Date.now() +
        this.refreshDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.userSession.updateMany({
        where: {
          id: existing.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          revokedAt: now,
        },
      });

      if (updated.count !== 1) {
        throw new UnauthorizedException(
          'Refresh token already used',
        );
      }

      await tx.userSession.create({
        data: {
          userId: existing.userId,
          tokenHash:
            this.hashToken(newRefreshToken),
          expiresAt: newExpiry,
          ipAddress:
            metadata.ipAddress?.slice(0, 64),
          userAgent:
            metadata.userAgent?.slice(0, 500),
        },
      });
    });

    return {
      accessToken:
        await this.signAccessToken(existing.userId),
      refreshToken: newRefreshToken,
      expiresIn: this.accessSeconds,
    };
  }

  // =========================================
  // LOGOUT
  // =========================================

  async logout(rawToken?: string) {
    if (!rawToken) {
      return { success: true };
    }

    await this.prisma.userSession.updateMany({
      where: {
        tokenHash: this.hashToken(rawToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { success: true };
  }

  // =========================================
  // CURRENT LEARNER
  // =========================================

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        emailVerifiedAt: true,
        isActive: true,
        currentStreak: true,
        longestStreak: true,
        createdAt: true,
      },
    });

    if (!user?.isActive || !user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Learner account unavailable',
      );
    }

    return user;
  }

  // =========================================
  // FORGOT PASSWORD
  // =========================================

  async forgotPassword(
    input: ForgotPasswordInput,
  ) {
    const response = {
      message:
        'If the account exists, password reset instructions will be sent.',
    };

    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (
      !user?.isActive ||
      !user.emailVerifiedAt
    ) {
      return response;
    }

    const token = this.newToken();
    const tokenHash = this.hashToken(token);

    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    await this.resetMail.sendResetToken(
      input.email,
      token,
    );

    return response;
  }

  // =========================================
  // RESET PASSWORD
  // =========================================

  async resetPassword(
    input: ResetPasswordInput,
  ) {
    const tokenHash =
      this.hashToken(input.token.toLowerCase());

    const existing =
      await this.prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: {
          user: true,
        },
      });

    if (
      !existing ||
      existing.usedAt ||
      existing.expiresAt <= new Date() ||
      !existing.user.isActive ||
      !existing.user.emailVerifiedAt
    ) {
      throw new BadRequestException(
        'Invalid or expired reset token',
      );
    }

    const passwordHash = await argon2.hash(
      input.newPassword,
      {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      },
    );

    await this.prisma.$transaction(async (tx) => {
      const consumed =
        await tx.passwordResetToken.updateMany({
          where: {
            id: existing.id,
            usedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          data: {
            usedAt: new Date(),
          },
        });

      if (consumed.count !== 1) {
        throw new BadRequestException(
          'Reset token already used',
        );
      }

      await tx.user.update({
        where: { id: existing.userId },
        data: {
          passwordHash,
        },
      });

      // Invalidate all previous login sessions.
      await tx.userSession.updateMany({
        where: {
          userId: existing.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    });

    return {
      success: true,
      message: 'Password updated successfully',
    };
  }
}
