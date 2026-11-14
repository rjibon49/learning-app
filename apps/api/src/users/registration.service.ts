import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma.service.js';
import { RegistrationMailService } from './registration-mail.service.js';
import type { RegisterInput, VerifyEmailInput } from './registration.schemas.js';

@Injectable()
export class RegistrationService {
  private readonly secret: string;
  private readonly lifetime = 10 * 60 * 1000;
  private readonly cooldown = 60_000;
  private readonly maxAttempts = 5;
  constructor(private readonly db: PrismaService, config: ConfigService, private readonly mail: RegistrationMailService) {
    this.secret = config.getOrThrow<string>('REGISTRATION_OTP_SECRET');
    if (this.secret.length < 32) throw new Error('REGISTRATION_OTP_SECRET must contain at least 32 characters');
  }
  private hash(email: string, otp: string) {
    return createHmac('sha256', this.secret).update(`${email}:${otp}`).digest('hex');
  }
  async register(input: RegisterInput): Promise<{ message: string }> {
    const email = input.email;
    const reply = { message: 'If registration is available, a verification code will be sent.' };
    if (await this.db.user.findUnique({ where: { email }, select: { id: true } })) return reply;
    const now = new Date();
    const pending = await this.db.pendingEmailRegistration.findUnique({ where: { email } });
    if (pending && pending.resendAvailableAt > now) return reply;
    const optIn = input.marketing.email || input.marketing.whatsapp || input.marketing.sms;
    const policy = optIn ? await this.db.consentPolicy.findFirst({
      where: { isActive: true, OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }] },
      orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }], select: { version: true },
    }) : null;
    if (optIn && !policy) throw new BadRequestException('Active marketing consent policy required for opt-in');
    const otp = String(randomInt(1_000_000)).padStart(6, '0');
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await this.db.pendingEmailRegistration.upsert({ where: { email }, create: {
      email, displayName: input.displayName, passwordHash, otpHash: this.hash(email, otp),
      expiresAt: new Date(now.getTime() + this.lifetime), resendAvailableAt: new Date(now.getTime() + this.cooldown),
      attempts: 0, phoneNumber: input.phoneNumber ?? null,
      marketingEmailOptIn: input.marketing.email, marketingWhatsappOptIn: input.marketing.whatsapp,
      marketingSmsOptIn: input.marketing.sms, consentPolicyVersion: policy?.version ?? null,
    }, update: {
      displayName: input.displayName, passwordHash, otpHash: this.hash(email, otp),
      expiresAt: new Date(now.getTime() + this.lifetime), resendAvailableAt: new Date(now.getTime() + this.cooldown),
      attempts: 0, phoneNumber: input.phoneNumber ?? null,
      marketingEmailOptIn: input.marketing.email, marketingWhatsappOptIn: input.marketing.whatsapp,
      marketingSmsOptIn: input.marketing.sms, consentPolicyVersion: policy?.version ?? null,
    }});
    await this.mail.sendVerificationCode(email, otp);
    return reply;
  }
  async verifyEmail(input: VerifyEmailInput): Promise<{ success: boolean; message: string }> {
    const now = new Date();
    const pending = await this.db.pendingEmailRegistration.findUnique({ where: { email: input.email } });
    const bad = 'Invalid or expired verification code';
    if (!pending || pending.expiresAt <= now || pending.attempts >= this.maxAttempts) throw new BadRequestException(bad);
    const increment = await this.db.pendingEmailRegistration.updateMany({ where: {
      id: pending.id, otpHash: pending.otpHash, expiresAt: { gt: now }, attempts: { lt: this.maxAttempts },
    }, data: { attempts: { increment: 1 } } });
    if (increment.count !== 1) throw new BadRequestException(bad);
    const expected = Buffer.from(pending.otpHash, 'hex');
    const actual = Buffer.from(this.hash(input.email, input.code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new BadRequestException(bad);
    const policy = pending.consentPolicyVersion ? await this.db.consentPolicy.findUnique({
      where: { version: pending.consentPolicyVersion }, select: { id: true },
    }) : null;
    await this.db.$transaction(async tx => {
      const consumed = await tx.pendingEmailRegistration.deleteMany({ where: {
        id: pending.id, otpHash: pending.otpHash, expiresAt: { gt: new Date() },
        attempts: { lte: this.maxAttempts },
      }});
      if (consumed.count !== 1) throw new BadRequestException(bad);
      const user = await tx.user.create({ data: {
        email: pending.email, displayName: pending.displayName, passwordHash: pending.passwordHash,
        phoneNumber: pending.phoneNumber, role: 'USER', isActive: true, emailVerifiedAt: new Date(),
      }, select: { id: true } });
      const choices = [
        { channel: 'EMAIL' as const, granted: pending.marketingEmailOptIn },
        { channel: 'WHATSAPP' as const, granted: pending.marketingWhatsappOptIn },
        { channel: 'SMS' as const, granted: pending.marketingSmsOptIn },
      ];
      await tx.marketingConsent.createMany({ data: choices.map(({ channel, granted }) => ({
        userId: user.id, policyId: policy?.id ?? null, channel, purpose: 'MARKETING' as const,
        granted, source: 'REGISTRATION', policyVersion: pending.consentPolicyVersion ?? 'none',
      })) });
      // Required by fail-closed send policy. Consent alone never grants permission.
      await tx.notificationPreference.createMany({ data: choices.map(({ channel, granted }) => ({
        userId: user.id, channel, purpose: 'MARKETING' as const, enabled: granted,
      })) });
    });
    return { success: true, message: 'Email verified. Your account is now active.' };
  }
}
