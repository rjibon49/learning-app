
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

import type {
  Request,
  Response,
} from 'express';

import { z } from 'zod';

import { AdminAuthService } from './admin-auth.service.js';
import { adminLoginSchema } from './admin-auth.schemas.js';
import { AdminJwtGuard } from './admin-jwt.guard.js';
import { CurrentAdmin } from './current-admin.decorator.js';

import type {
  AuthenticatedAdmin,
  AdminRequestMetadata,
} from './admin-auth.types.js';

const REFRESH_COOKIE = 'admin_refresh_token';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly authService: AdminAuthService,
    private readonly config: ConfigService,
  ) {}

  // ==========================================
  // COOKIE SETTINGS
  // ==========================================

  private cookiePath(): string {
    const prefix = (
      this.config.get<string>('API_PREFIX') ??
      'api'
    )
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    return `/${prefix}/admin/auth`;
  }

  private production(): boolean {
    return (
      this.config.get<string>('NODE_ENV') ===
      'production'
    );
  }

  private refreshDays(): number {
    return Number(
      this.config.get<number>(
        'ADMIN_REFRESH_TOKEN_DAYS',
        7,
      ),
    );
  }

  private setRefreshCookie(
    response: Response,
    token: string,
  ): void {
    response.cookie(
      REFRESH_COOKIE,
      token,
      {
        httpOnly: true,
        secure: this.production(),
        sameSite: 'lax',

        path: this.cookiePath(),

        maxAge:
          this.refreshDays() *
          24 * 60 * 60 * 1000,
      },
    );
  }

  private clearRefreshCookie(
    response: Response,
  ): void {
    response.clearCookie(
      REFRESH_COOKIE,
      {
        httpOnly: true,
        secure: this.production(),
        sameSite: 'lax',
        path: this.cookiePath(),
      },
    );
  }

  private noStore(response: Response): void {
    response.setHeader(
      'Cache-Control',
      'no-store, private',
    );
  }

  private metadata(
    request: Request,
  ): AdminRequestMetadata {
    return {
      ipAddress: request.ip ?? null,

      userAgent:
        request.get('user-agent') ?? null,
    };
  }

  // ==========================================
  // ORIGIN / CSRF VALIDATION
  // ==========================================

  private allowedOrigins(): string[] {
    const value =
      this.config.get<string | string[]>(
        'CORS_ORIGINS',
        [],
      );

    if (Array.isArray(value)) {
      return value;
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private assertAllowedOrigin(
    request: Request,
    requireBrowserOrigin = false,
  ): void {
    const allowed = this.allowedOrigins();

    const origin = request.get('origin');

    if (origin) {
      if (!allowed.includes(origin)) {
        throw new ForbiddenException(
          'Request origin is not allowed',
        );
      }

      return;
    }

    const referer = request.get('referer');

    if (referer) {
      try {
        const refererOrigin =
          new URL(referer).origin;

        if (allowed.includes(refererOrigin)) {
          return;
        }
      } catch {
        // Invalid Referer is rejected below.
      }

      throw new ForbiddenException(
        'Request origin is not allowed',
      );
    }

    const fetchSite =
      request.get('sec-fetch-site');

    if (
      fetchSite === 'cross-site' ||
      fetchSite === 'same-site'
    ) {
      throw new ForbiddenException(
        'Cross-origin cookie request rejected',
      );
    }

    if (requireBrowserOrigin) {
      throw new ForbiddenException(
        'Request origin verification required',
      );
    }
  }

  private refreshToken(
    request: Request,
  ): string | undefined {
    const value: unknown =
      request.cookies?.[REFRESH_COOKIE];

    if (
      typeof value !== 'string' ||
      value.length > 256
    ) {
      return undefined;
    }

    return value;
  }

  // ==========================================
  // LOGIN
  // ==========================================

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: {
      limit: 3,
      ttl: 1000,
    },
    medium: {
      limit: 5,
      ttl: 60000,
    },
    long: {
      limit: 30,
      ttl: 3600000,
    },
  })
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    this.assertAllowedOrigin(request);

    const parsed =
      adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(
        z.flattenError(parsed.error),
      );
    }

    const result =
      await this.authService.login(
        parsed.data,
        this.metadata(request),
      );

    this.setRefreshCookie(
      response,
      result.refreshToken,
    );

    this.noStore(response);

    return {
      admin: result.admin,
      accessToken: result.accessToken,

      accessTokenExpiresIn:
        result.accessTokenExpiresIn,
    };
  }

  // ==========================================
  // REFRESH
  // ==========================================

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: {
      limit: 10,
      ttl: 60000,
    },
    medium: {
      limit: 30,
      ttl: 600000,
    },
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    // Refresh uses an HttpOnly cookie,
    // so explicitly validate request origin.
    this.assertAllowedOrigin(request, true);

    const token = this.refreshToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'Refresh session required',
      );
    }

    try {
      const result =
        await this.authService.refresh(
          token,
          this.metadata(request),
        );

      this.setRefreshCookie(
        response,
        result.refreshToken,
      );

      this.noStore(response);

      return {
        accessToken: result.accessToken,

        accessTokenExpiresIn:
          result.accessTokenExpiresIn,
      };
    } catch (error) {
      this.clearRefreshCookie(response);
      this.noStore(response);
      throw error;
    }
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    this.assertAllowedOrigin(request, true);

    await this.authService.logout(
      this.refreshToken(request),
    );

    this.clearRefreshCookie(response);
    this.noStore(response);

    return {
      success: true,
    };
  }

  // ==========================================
  // LOGOUT ALL
  // ==========================================

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtGuard)
  async logoutAll(
    @CurrentAdmin()
    admin: AuthenticatedAdmin,

    @Req() request: Request,

    @Res({ passthrough: true })
    response: Response,
  ) {
    this.assertAllowedOrigin(request);

    await this.authService.logoutAll(
      admin.id,
      this.metadata(request),
    );

    this.clearRefreshCookie(response);
    this.noStore(response);

    return {
      success: true,
    };
  }

  // ==========================================
  // CURRENT ADMIN
  // ==========================================

  @Get('me')
  @UseGuards(AdminJwtGuard)
  me(
    @CurrentAdmin()
    admin: AuthenticatedAdmin,

    @Res({ passthrough: true })
    response: Response,
  ) {
    this.noStore(response);
    return admin;
  }
}
