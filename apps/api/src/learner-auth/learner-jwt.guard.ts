
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import type { Request } from 'express';

import { PrismaService } from '../prisma.service.js';

export type LearnerRequest = Request & {
  learner?: {
    id: string;
    email: string | null;
  };
};

@Injectable()
export class LearnerJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp()
        .getRequest<LearnerRequest>();

    const authorization =
      request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Learner authentication required',
      );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException(
        'Missing access token',
      );
    }

    let payload: {
      sub?: string;
      typ?: string;
    };

    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>(
          'LEARNER_JWT_SECRET',
        ),
        issuer: 'learning-api',
        audience: 'learning-learner',
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired access token',
      );
    }

    if (
      payload.typ !== 'learner' ||
      !payload.sub
    ) {
      throw new UnauthorizedException(
        'Invalid learner token',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      !user.emailVerifiedAt ||
      user.role !== 'USER'
    ) {
      throw new UnauthorizedException(
        'Learner account unavailable',
      );
    }

    request.learner = {
      id: user.id,
      email: user.email,
    };

    return true;
  }
}
