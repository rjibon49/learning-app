
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

  // ==========================================
  // EMAIL OTP HASHING
  // ==========================================

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

  // ==========================================
  // ACTIVE CONSENT POLICY
  // ==========================================

  private async getActiveConsentPolicy() {
    const now = new Date();

    return this.prisma.consentPolicy.findFirst({
      where: {
        isActive: true,
        OR: [
          { effectiveAt: null },
          { effectiveAt: { lte: now } },
        ],
      },
      select: {
        id: true,
        version: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ==========================================
  // REGISTRATION
  // ==========================================

  async register(
    input: RegisterInput,
  ): Promise<{ message: string }> {
    const email = input.email;

    const genericResponse = {
      message:
        'If registration is available, a verification code will be sent.',
    };

    const existingUser =
      await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

    // Avoid exposing existing account emails.
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

    const marketing = input.marketing;

    const requestedMarketingConsent =
      marketing.email ||
      marketing.whatsapp ||
      marketing.sms;

    const consentPolicy =
      requestedMarketingConsent
        ? await this.getActiveConsentPolicy()
        : null;

    // Marketing consent must reference a
    // real, currently active policy.
    if (
      requestedMarketingConsent &&
      !consentPolicy
    ) {
      throw new BadRequestException(
        'Marketing consent is not yet available. Please uncheck marketing preferences and continue registration.',
      );
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

    // Only requested and verified choices
    // are stored as true.
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

        phoneNumber: input.phoneNumber ?? null,

        marketingEmailOptIn: marketing.email,
        marketingWhatsappOptIn: marketing.whatsapp,
        marketingSmsOptIn: marketing.sms,

        consentPolicyVersion:
          consentPolicy?.version ?? null,
      },

      update: {
        displayName: input.displayName,
        passwordHash,
        otpHash,
        expiresAt,
        resendAvailableAt,
        attempts: 0,

        phoneNumber: input.phoneNumber ?? null,

        marketingEmailOptIn: marketing.email,
        marketingWhatsappOptIn: marketing.whatsapp,
        marketingSmsOptIn: marketing.sms,

        consentPolicyVersion:
          consentPolicy?.version ?? null,
      },
    });

    // Existing email OTP delivery.
    await this.mail.sendVerificationCode(
      email,
      code,
    );

    return genericResponse;
  }

  // ==========================================
  // EMAIL VERIFICATION
  // ==========================================

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

    // Atomically count each verification attempt.
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

    // Resolve policy used during registration.
    // It may no longer be active, but its
    // historical version must be preserved.
    const policy = pending.consentPolicyVersion
      ? await this.prisma.consentPolicy.findUnique({
          where: {
            version: pending.consentPolicyVersion,
          },
          select: { id: true },
        })
      : null;

    const consentVersion =
      pending.consentPolicyVersion ?? 'none';

    // Registration and consent history are
    // committed within one transaction.
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

      const user = await tx.user.create({
        data: {
          email: pending.email,
          displayName: pending.displayName,
          passwordHash: pending.passwordHash,

          phoneNumber: pending.phoneNumber,

          role: 'USER',
          isActive: true,

          emailVerifiedAt: new Date(),
        },
        select: { id: true },
      });

      await tx.marketingConsent.createMany({
        data: [
          {
            userId: user.id,
            policyId: policy?.id ?? null,
            channel: 'EMAIL',
            purpose: 'MARKETING',
            granted:
              pending.marketingEmailOptIn,
            source: 'REGISTRATION',
            policyVersion: consentVersion,
          },
          {
            userId: user.id,
            policyId: policy?.id ?? null,
            channel: 'WHATSAPP',
            purpose: 'MARKETING',
            granted:
              pending.marketingWhatsappOptIn,
            source: 'REGISTRATION',
            policyVersion: consentVersion,
          },
          {
            userId: user.id,
            policyId: policy?.id ?? null,
            channel: 'SMS',
            purpose: 'MARKETING',
            granted:
              pending.marketingSmsOptIn,
            source: 'REGISTRATION',
            policyVersion: consentVersion,
          },
        ],
      });
    });

    return {
      success: true,
      message:
        'Email verified. Your account is now active.',
    };
  }
}
