
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma.service.js';
import { RegistrationMailService } from './registration-mail.service.js';

import type {
  RegisterInput,
  VerifyEmailInput,
} from './registration.schemas.js';

@Injectable()
export class RegistrationService {
  private readonly otpSecret: string;

  private readonly otpValidityMs = 10 * 60 * 1000;
  private readonly resendCooldownMs = 60 * 1000;
  private readonly maxAttempts = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: RegistrationMailService,
  ) {
    this.otpSecret =
      this.config.getOrThrow<string>(
        'REGISTRATION_OTP_SECRET',
      );

    if (this.otpSecret.length < 32) {
      throw new Error(
        'REGISTRATION_OTP_SECRET must contain at least 32 characters',
      );
    }
  }

  private hashOtp(
    email: string,
    code: string,
  ): string {
    return createHmac('sha256', this.otpSecret)
      .update(`${email}:${code}`)
      .digest('hex');
  }

  private isCorrectCode(
    storedHash: string,
    suppliedHash: string,
  ): boolean {
    const stored = Buffer.from(storedHash, 'hex');
    const supplied = Buffer.from(suppliedHash, 'hex');

    if (stored.length !== supplied.length) {
      return false;
    }

    return timingSafeEqual(stored, supplied);
  }

  async register(
    input: RegisterInput,
  ): Promise<{ message: string }> {
    const email = input.email;

    const genericResponse = {
      message:
        'If registration is available, a verification code will be sent.',
    };

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Avoid exposing whether an account exists.
    if (existingUser) {
      return genericResponse;
    }

    const now = new Date();

    const existingPending =
      await this.prisma.pendingEmailRegistration.findUnique({
        where: { email },
      });

    if (
      existingPending &&
      existingPending.resendAvailableAt > now
    ) {
      return genericResponse;
    }

    const code = randomInt(0, 1000000)
      .toString()
      .padStart(6, '0');

    const otpHash = this.hashOtp(email, code);

    const passwordHash = await argon2.hash(
      input.password,
      {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      },
    );

    const expiresAt = new Date(
      now.getTime() + this.otpValidityMs,
    );

    const resendAvailableAt = new Date(
      now.getTime() + this.resendCooldownMs,
    );

    await this.prisma.pendingEmailRegistration.upsert({
      where: { email },

      create: {
        email,
        displayName: input.displayName,
        passwordHash,
        otpHash,
        expiresAt,
        resendAvailableAt,
        attempts: 0,
      },

      update: {
        displayName: input.displayName,
        passwordHash,
        otpHash,
        expiresAt,
        resendAvailableAt,
        attempts: 0,
      },
    });

    await this.mail.sendVerificationCode(email, code);

    return genericResponse;
  }

  async verifyEmail(
    input: VerifyEmailInput,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const email = input.email;
    const now = new Date();

    const pending =
      await this.prisma.pendingEmailRegistration.findUnique({
        where: { email },
      });

    const invalidCodeMessage =
      'Invalid or expired verification code';

    if (
      !pending ||
      pending.expiresAt <= now ||
      pending.attempts >= this.maxAttempts
    ) {
      throw new BadRequestException(
        invalidCodeMessage,
      );
    }

    // Atomically count the verification attempt.
    const attemptUpdate =
      await this.prisma.pendingEmailRegistration.updateMany({
        where: {
          id: pending.id,
          otpHash: pending.otpHash,
          expiresAt: { gt: now },
          attempts: { lt: this.maxAttempts },
        },
        data: {
          attempts: { increment: 1 },
        },
      });

    if (attemptUpdate.count !== 1) {
      throw new BadRequestException(
        invalidCodeMessage,
      );
    }

    const suppliedHash = this.hashOtp(
      email,
      input.code,
    );

    if (
      !this.isCorrectCode(
        pending.otpHash,
        suppliedHash,
      )
    ) {
      throw new BadRequestException(
        invalidCodeMessage,
      );
    }

    // The pending record is consumed in the same
    // transaction that creates the verified user.
    await this.prisma.$transaction(async (tx) => {
      const deleted =
        await tx.pendingEmailRegistration.deleteMany({
          where: {
            id: pending.id,
            otpHash: pending.otpHash,
            expiresAt: { gt: new Date() },
            attempts: {
              lte: this.maxAttempts,
            },
          },
        });

      if (deleted.count !== 1) {
        throw new BadRequestException(
          invalidCodeMessage,
        );
      }

      await tx.user.create({
        data: {
          email: pending.email,
          displayName: pending.displayName,
          passwordHash: pending.passwordHash,

          role: 'USER',
          isActive: true,

          // Email OTP verification completed.
          emailVerifiedAt: new Date(),
        },
      });
    });

    return {
      success: true,
      message:
        'Email verified. Your account is now active.',
    };
  }
}
