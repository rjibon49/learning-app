
import {
  Body,
  Controller,
  Delete,
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


import { LearnerAuthService } from './learner-auth.service.js';
import { LearnerJwtGuard } from './learner-jwt.guard.js';

import type {
  LearnerRequest,
} from './learner-jwt.guard.js';

import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshBodySchema,
  deleteAccountSchema,
} from './learner-auth.schemas.js';
import { LearnerAccountDeletionService } from './account-deletion.service.js';

import { validate } from '../common/validation.js';

const COOKIE_NAME = 'learning_refresh';


@Controller('auth/learner')
export class LearnerAuthController {
  constructor(
    private readonly service: LearnerAuthService,
    private readonly config: ConfigService,
    private readonly accountDeletion: LearnerAccountDeletionService,
  ) {}

  /**
   * React Native apps cannot rely on HttpOnly cookies.
   * They send `X-Client-Type: mobile`, receive `refreshToken` in the JSON body,
   * store it in SecureStore/Keychain and send it back in the body.
   * The website keeps using the HttpOnly cookie (no change).
   */
  private isMobile(request: Request): boolean {
    return (
      String(request.headers['x-client-type'] ?? '').toLowerCase() ===
      'mobile'
    );
  }

  private readRefreshToken(
    request: Request,
    body: unknown,
  ): string | undefined {
    const fromCookie = request.cookies?.[COOKIE_NAME] as string | undefined;

    if (fromCookie) return fromCookie;

    return validate(refreshBodySchema, body ?? {}).refreshToken;
  }

  private secureCookie() {
    return this.config.get<string>(
      'NODE_ENV',
    ) === 'production';
  }

  private setRefreshCookie(
    response: Response,
    token: string,
  ): void {
    response.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.secureCookie(),
      sameSite: 'lax',
      path: '/api/auth/learner',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(
    response: Response,
  ): void {
    response.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: this.secureCookie(),
      sameSite: 'lax',
      path: '/api/auth/learner',
    });
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip ?? null,
      userAgent:
        request.headers['user-agent'] ?? null,
    };
  }

  private verifyOrigin(request: Request): void {
    const origin = request.headers.origin;

    // Native clients may omit Origin.
    if (!origin) return;

    const configured = this.config.get<
      string[] | string
    >('CORS_ORIGINS', []);

    const allowed = Array.isArray(configured)
      ? configured
      : configured
          .split(',')
          .map((item) => item.trim());

    if (!allowed.includes(origin)) {
      throw new UnauthorizedException(
        'Origin not allowed',
      );
    }
  }

  // ======================================
  // LOGIN
  // ======================================

  @Post('login')
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    medium: { limit: 15, ttl: 600000 },
  })
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.verifyOrigin(request);

    const result = await this.service.login(
      validate(loginSchema, body),
      this.metadata(request),
    );

    this.setRefreshCookie(
      response,
      result.refreshToken,
    );

    response.setHeader('Cache-Control', 'no-store');

    return {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      ...(this.isMobile(request)
        ? { refreshToken: result.refreshToken }
        : {}),
    };
  }

  // ======================================
  // REFRESH
  // ======================================

  @Post('refresh')
  @Throttle({
    short: { limit: 10, ttl: 60000 },
  })
  async refresh(
    @Req() request: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.verifyOrigin(request);

    const token = this.readRefreshToken(request, body);

    if (!token) {
      throw new UnauthorizedException(
        'Refresh session required',
      );
    }

    const result = await this.service.refresh(
      token,
      this.metadata(request),
    );

    this.setRefreshCookie(
      response,
      result.refreshToken,
    );

    response.setHeader('Cache-Control', 'no-store');

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      ...(this.isMobile(request)
        ? { refreshToken: result.refreshToken }
        : {}),
    };
  }

  // ======================================
  // LOGOUT
  // ======================================

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.verifyOrigin(request);

    const token = this.readRefreshToken(request, body);

    const result = await this.service.logout(token);

    this.clearRefreshCookie(response);

    response.setHeader('Cache-Control', 'no-store');

    return result;
  }

  // ======================================
  // PROFILE
  // ======================================

  @Get('me')
  @UseGuards(LearnerJwtGuard)
  async me(@Req() request: LearnerRequest) {
    const learner = request.learner;

    if (!learner) {
      throw new UnauthorizedException();
    }

    return this.service.me(learner.id);
  }

  // ======================================
  // DELETE MY ACCOUNT
  // Apple App Store & Google Play require in-app account deletion.
  // Body: { "password": "..." }
  // ======================================

  @Delete('me')
  @UseGuards(LearnerJwtGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 3, ttl: 60000 },
  })
  async deleteMe(
    @Req() request: LearnerRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const learnerId = request.learner?.id;

    if (!learnerId) {
      throw new UnauthorizedException('Learner authentication required');
    }

    const input = validate(deleteAccountSchema, body);

    await this.service.verifyPassword(learnerId, input.password);

    const result = await this.accountDeletion.deleteAccount(learnerId);

    this.clearRefreshCookie(response);

    return result;
  }

  // ======================================
  // FORGOT PASSWORD
  // ======================================

  @Post('forgot-password')
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    medium: { limit: 5, ttl: 600000 },
    long: { limit: 10, ttl: 3600000 },
  })
  forgotPassword(@Body() body: unknown) {
    return this.service.forgotPassword(
      validate(forgotPasswordSchema, body),
    );
  }

  // ======================================
  // RESET PASSWORD
  // ======================================

  @Post('reset-password')
  @Throttle({
    short: { limit: 5, ttl: 60000 },
  })
  resetPassword(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.clearRefreshCookie(response);

    return this.service.resetPassword(
      validate(resetPasswordSchema, body),
    );
  }
}
