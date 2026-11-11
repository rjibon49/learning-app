
import {
  BadRequestException,
  Body,
  Controller,
  Get,
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

import { LearnerAuthService } from './learner-auth.service.js';
import { LearnerJwtGuard } from './learner-jwt.guard.js';

import type {
  LearnerRequest,
} from './learner-jwt.guard.js';

import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './learner-auth.schemas.js';

const COOKIE_NAME = 'learning_refresh';

function validate<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }

  return result.data;
}

@Controller('auth/learner')
export class LearnerAuthController {
  constructor(
    private readonly service: LearnerAuthService,
    private readonly config: ConfigService,
  ) {}

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
    @Res({ passthrough: true }) response: Response,
  ) {
    this.verifyOrigin(request);

    const token =
      request.cookies?.[COOKIE_NAME] as
        | string
        | undefined;

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
    };
  }

  // ======================================
  // LOGOUT
  // ======================================

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.verifyOrigin(request);

    const token =
      request.cookies?.[COOKIE_NAME] as
        | string
        | undefined;

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
