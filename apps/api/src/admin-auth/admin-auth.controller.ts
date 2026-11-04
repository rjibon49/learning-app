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
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AdminAuthService } from './admin-auth.service.js';
import { adminLoginSchema } from './admin-auth.schemas.js';
import { AdminJwtGuard } from './admin-jwt.guard.js';
import { CurrentAdmin } from './current-admin.decorator.js';
import type { AuthenticatedAdmin } from './admin-auth.types.js';

const REFRESH_COOKIE = 'admin_refresh_token';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly authService: AdminAuthService,
    private readonly config: ConfigService,
  ) {}

  @Throttle({
    short: { limit: 3, ttl: 1000 },
    medium: { limit: 5, ttl: 60000 },
  })
  @Post('login')
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const input = adminLoginSchema.parse(body);
      const result = await this.authService.login(
        input,
        this.getRequestMetadata(request),
      );
      this.setRefreshCookie(response, result.refreshToken);

      return {
        admin: result.admin,
        accessToken: result.accessToken,
        accessTokenExpiresIn: result.accessTokenExpiresIn,
      };
    } catch (error) {
      this.handleValidationError(error);
    }
  }

  @Throttle({ medium: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const result = await this.authService.refresh(
      refreshToken,
      this.getRequestMetadata(request),
    );
    this.setRefreshCookie(response, result.refreshToken);

    return {
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
    };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.authService.logout(refreshToken);
    this.clearRefreshCookie(response);
    return { success: true };
  }

  @UseGuards(AdminJwtGuard)
  @Post('logout-all')
  async logoutAll(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logoutAll(admin.id, this.getRequestMetadata(request));
    this.clearRefreshCookie(response);
    return { success: true };
  }

  @UseGuards(AdminJwtGuard)
  @Get('me')
  me(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return admin;
  }

  private getRequestMetadata(request: Request) {
    return {
      ipAddress: request.ip ?? null,
      userAgent: request.get('user-agent') ?? null,
    };
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    const production = this.config.get<string>('NODE_ENV') === 'production';
    const days = this.config.get<number>('ADMIN_REFRESH_TOKEN_DAYS', 30);

    response.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: production,
      sameSite: 'strict',
      path: '/api/admin/auth',
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(response: Response) {
    const production = this.config.get<string>('NODE_ENV') === 'production';
    response.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: production,
      sameSite: 'strict',
      path: '/api/admin/auth',
    });
  }

  private handleValidationError(error: unknown): never {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error.issues,
      });
    }
    throw error;
  }
}
