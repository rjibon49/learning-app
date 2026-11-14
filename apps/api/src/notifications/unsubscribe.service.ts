import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';

type TokenPayload = { u: string; exp: number; p: 'EMAIL_MARKETING' };

/** Signed single-purpose opt-out token. No login or re-subscription privilege. */
@Injectable()
export class UnsubscribeService {
  constructor(private readonly db: PrismaService, private readonly config: ConfigService) {}

  private secret(): string {
    const secret = this.config.get<string>('NOTIFY_UNSUBSCRIBE_SECRET');
    if (!secret || secret.length < 32) throw new Error('NOTIFY_UNSUBSCRIBE_SECRET missing or too short');
    return secret;
  }

  sign(userId: string): string {
    const data: TokenPayload = { u: userId, exp: Math.floor(Date.now() / 1000) + 30 * 86400, p: 'EMAIL_MARKETING' };
    const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
    const mac = createHmac('sha256', this.secret()).update(payload).digest('base64url');
    return `${payload}.${mac}`;
  }

  async unsubscribe(token: string) {
    if (!token || token.length > 4096) throw new BadRequestException('Invalid unsubscribe link');
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new BadRequestException('Invalid unsubscribe link');
    const [payload, sig] = parts;
    const expected = createHmac('sha256', this.secret()).update(payload).digest();
    const supplied = Buffer.from(sig, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new BadRequestException('Invalid unsubscribe link');
    }
    let decoded: unknown;
    try { decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
    catch { throw new BadRequestException('Invalid unsubscribe link'); }
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
      throw new BadRequestException('Invalid unsubscribe link');
    }
    const data = decoded as Record<string, unknown>;
    if (data.p !== 'EMAIL_MARKETING' || typeof data.u !== 'string' || !data.u || data.u.length > 191 ||
        typeof data.exp !== 'number' || !Number.isSafeInteger(data.exp) || data.exp <= Math.floor(Date.now() / 1000)) {
      throw new BadRequestException('Expired or invalid unsubscribe link');
    }
    const userId = data.u;
    const exists = await this.db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) throw new BadRequestException('Invalid unsubscribe link');
    await this.db.$transaction(async tx => {
      await tx.notificationPreference.upsert({
        where: { userId_channel_purpose: { userId, channel: 'EMAIL', purpose: 'MARKETING' } },
        create: { userId, channel: 'EMAIL', purpose: 'MARKETING', enabled: false },
        update: { enabled: false },
      });
      const latest = await tx.marketingConsent.findFirst({
        where: { userId, channel: 'EMAIL', purpose: 'MARKETING' },
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
        select: { granted: true },
      });
      // Idempotent opt-out: avoid creating unlimited duplicate audit events on repeated link clicks.
      if (latest?.granted !== false) {
        await tx.marketingConsent.create({
          data: { userId, channel: 'EMAIL', purpose: 'MARKETING', granted: false,
            source: 'EMAIL_UNSUBSCRIBE', policyVersion: 'withdrawal' },
        });
      }
    });
    return { success: true, message: 'Email marketing unsubscribed' };
  }
}
