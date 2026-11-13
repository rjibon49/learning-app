import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';

/** Signed, purpose-limited opt-out links. The token only permits disabling
 * EMAIL MARKETING for one user; it cannot authenticate or enable anything.
 */
@Injectable()
export class UnsubscribeService {
  constructor(private readonly db: PrismaService, private readonly config: ConfigService) {}
  private secret(): string {
    const secret = this.config.get<string>('NOTIFY_UNSUBSCRIBE_SECRET');
    if (!secret || secret.length < 32) throw new Error('NOTIFY_UNSUBSCRIBE_SECRET missing or too short');
    return secret;
  }
  sign(userId: string): string {
    const expires = Math.floor(Date.now() / 1000) + 30 * 86400;
    const payload = Buffer.from(JSON.stringify({ u: userId, exp: expires, p: 'EMAIL_MARKETING' })).toString('base64url');
    const signature = createHmac('sha256', this.secret()).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }
  async unsubscribe(token: string) {
    const [payload, sig, extra] = token.split('.');
    if (!payload || !sig || extra || payload.length > 2048) throw new BadRequestException('Invalid unsubscribe link');
    const expected = createHmac('sha256', this.secret()).update(payload).digest();
    let provided: Buffer;
    try { provided = Buffer.from(sig, 'base64url'); } catch { throw new BadRequestException('Invalid unsubscribe link'); }
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new BadRequestException('Invalid unsubscribe link');
    let data: { u?: unknown; exp?: unknown; p?: unknown };
    try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as typeof data; }
    catch { throw new BadRequestException('Invalid unsubscribe link'); }
    if (typeof data.u !== 'string' || data.u.length > 191 || data.p !== 'EMAIL_MARKETING' ||
      typeof data.exp !== 'number' || !Number.isSafeInteger(data.exp) || data.exp < Date.now() / 1000) {
      throw new BadRequestException('Expired or invalid unsubscribe link');
    }
    await this.db.$transaction(async tx => {
      await tx.notificationPreference.upsert({
        where: { userId_channel_purpose: { userId: data.u as string, channel: 'EMAIL', purpose: 'MARKETING' } },
        create: { userId: data.u as string, channel: 'EMAIL', purpose: 'MARKETING', enabled: false },
        update: { enabled: false },
      });
      await tx.marketingConsent.create({ data: {
        userId: data.u as string, channel: 'EMAIL', purpose: 'MARKETING', granted: false,
        source: 'EMAIL_UNSUBSCRIBE', policyVersion: 'withdrawal',
      }});
    });
    return { success: true, message: 'Email marketing unsubscribed' };
  }
}
