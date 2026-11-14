import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';
import { DeliveryPolicyService } from './delivery-policy.service.js';
import { NotificationProviderAdapters } from './provider-adapters.js';
import { UnsubscribeService } from './unsubscribe.service.js';

const LEASE_MS = 120_000;
const MAX_LOOKUP = 30;
const POLL_MS = 15_000;
const MAX_BACKOFF_MS = 3_600_000;
const SMTP_SEND_TIMEOUT_MS = 30_000;

type FinishPatch = {
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  errorCode?: string | null;
  errorMessage?: string | null;
  providerMessageId?: string | null;
  sentAt?: Date | null;
  nextRetryAt?: Date | null;
};

@Injectable()
export class ReliableNotificationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReliableNotificationWorkerService.name);
  private readonly owner = randomUUID();
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;

  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
    private readonly policy: DeliveryPolicyService,
    private readonly adapters: NotificationProviderAdapters,
    private readonly unsubscribe: UnsubscribeService,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>('NOTIFICATION_DELIVERY_WORKER_ENABLED', 'false') !== 'true') {
      this.logger.log('Reliable delivery worker disabled');
      return;
    }
    if (this.config.get<string>('NOTIFICATION_WORKER_PROCESS', 'false') !== 'true') {
      this.logger.error('Worker enabled outside dedicated process; refusing to start');
      return;
    }
    this.logger.warn('Delivery worker enabled: dedicated process only');
    this.timer = setInterval(() => { void this.runOnce(); }, POLL_MS);
    void this.runOnce();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async claim(id: string) {
    const now = new Date();
    const job = await this.db.notificationDelivery.findUnique({
      where: { id }, select: { attempts: true, maxAttempts: true },
    });
    if (!job || job.attempts >= job.maxAttempts) return null;
    // CAS by status and attempt count: only one concurrent caller can take QUEUED -> PROCESSING.
    const changed = await this.db.notificationDelivery.updateMany({
      where: {
        id,
        status: 'QUEUED',
        attempts: { lt: job.maxAttempts },
        scheduledAt: { lte: now },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      data: {
        status: 'PROCESSING',
        lockOwner: this.owner,
        lockedUntil: new Date(now.getTime() + LEASE_MS),
        claimVersion: { increment: 1 },
        attempts: { increment: 1 },
      },
    });
    if (changed.count !== 1) return null;
    return this.db.notificationDelivery.findFirst({
      where: { id, lockOwner: this.owner, status: 'PROCESSING' },
      include: { template: { include: { translations: true, providerConfig: true } } },
    });
  }

  private async finish(id: string, version: number, patch: FinishPatch): Promise<boolean> {
    const changed = await this.db.notificationDelivery.updateMany({
      where: {
        id, status: 'PROCESSING', lockOwner: this.owner, claimVersion: version,
        lockedUntil: { gt: new Date() },
      },
      data: { ...patch, lockOwner: null, lockedUntil: null },
    });
    if (changed.count !== 1) this.logger.error(`Lease lost for ${id}; reconcile before retry`);
    return changed.count === 1;
  }

  private async defer(id: string, version: number): Promise<void> {
    // Provider unavailable is not a send attempt; preserve the attempts budget.
    await this.db.notificationDelivery.updateMany({
      where: {
        id, status: 'PROCESSING', lockOwner: this.owner, claimVersion: version,
        lockedUntil: { gt: new Date() },
      },
      data: {
        status: 'QUEUED', lockOwner: null, lockedUntil: null,
        attempts: { decrement: 1 },
        nextRetryAt: new Date(Date.now() + MAX_BACKOFF_MS),
      },
    });
  }

  private render(source: string | null, vars: Record<string, string>): string {
    return (source ?? '').replace(/{{\s*([a-z][a-zA-Z0-9_]*)\s*}}/g, (_match: string, key: string) => {
      if (!Object.prototype.hasOwnProperty.call(vars, key)) throw new Error('MISSING_TEMPLATE_VARIABLE');
      return vars[key];
    });
  }

  private async process(id: string): Promise<void> {
    const row = await this.claim(id);
    if (!row) return;
    const fence = row.claimVersion;
    const skip = async (reason: string) => {
      await this.finish(id, fence, { status: 'SKIPPED', errorCode: reason, nextRetryAt: null });
    };

    try {
      if (row.channel !== 'EMAIL' || row.purpose !== 'MARKETING' || !row.userId || !row.template) {
        await skip('CHANNEL_NOT_READY');
        return;
      }
      const template = row.template;
      if (!template.isActive || template.channel !== 'EMAIL' || template.purpose !== 'MARKETING') {
        await skip('TEMPLATE_INACTIVE');
        return;
      }
      const provider = template.providerConfig;
      const sendingEnabled = this.config.get<string>('NOTIFY_EMAIL_SEND_ENABLED', 'false') === 'true';
      if (!provider || !provider.isEnabled || provider.isTestMode || provider.channel !== 'EMAIL' ||
          provider.providerKey !== 'smtp' || !sendingEnabled) {
        await this.defer(id, fence);
        return;
      }

      const raw = row.payloadJson;
      if (!raw || Array.isArray(raw) || typeof raw !== 'object') {
        await skip('INVALID_PAYLOAD');
        return;
      }
      const payload = raw as Record<string, unknown>;
      const locale = typeof payload.locale === 'string' ? payload.locale.toLowerCase() : 'en';
      const rawVars = payload.variables;
      if (!rawVars || typeof rawVars !== 'object' || Array.isArray(rawVars) ||
          !Object.values(rawVars).every(v => typeof v === 'string')) {
        await skip('INVALID_VARIABLES');
        return;
      }
      const vars = rawVars as Record<string, string>;
      const translation = template.translations.find(t => t.locale.toLowerCase() === locale) ??
        template.translations.find(t => t.locale.toLowerCase() === locale.split('-')[0]) ??
        template.translations.find(t => t.locale.toLowerCase() === 'en');
      if (!translation) { await skip('MISSING_TRANSLATION'); return; }
      const subject = this.render(translation.title, vars);
      const message = this.render(translation.body, vars);
      if (!subject || subject.length > 220 || message.length > 9_000) {
        await skip('RENDER_LENGTH_INVALID'); return;
      }
      const baseRaw = this.config.get<string>('NOTIFY_PUBLIC_BASE_URL');
      if (!baseRaw || this.config.get<string>('NOTIFY_UNSUBSCRIBE_READY', 'false') !== 'true') {
        await this.defer(id, fence);
        return;
      }
      let base: URL;
      try {
        base = new URL(baseRaw);
        if (base.protocol !== 'https:' || base.username || base.password) throw new Error('INVALID_URL');
      } catch { await this.defer(id, fence); return; }
      // NOTIFY_PUBLIC_BASE_URL must be the public API origin, not the CMS/website origin.
      // Route is served by UnsubscribeController and only POST changes preferences.
      const prefix = (this.config.get<string>('API_PREFIX') ?? 'api').replace(/^\/+|\/+$/g, '');
      const link = new URL(`/${prefix}/notifications/unsubscribe`, base);
      link.searchParams.set('token', this.unsubscribe.sign(row.userId));
      const body = `${message}\n\nStop marketing emails: ${link.toString()}`;

      // Immediately before SMTP submission, re-check user activity, preferences and consent.
      const eligibility = await this.policy.evaluate(row.userId, 'EMAIL', 'MARKETING');
      if (!eligibility.allowed) { await skip(eligibility.reason); return; }
      if (Date.now() + SMTP_SEND_TIMEOUT_MS >= (row.lockedUntil?.getTime() ?? 0)) {
        // Do not initiate sending with insufficient remaining lease time.
        await this.finish(id, fence, { status: 'FAILED', errorCode: 'LEASE_TOO_SHORT_RECONCILE' });
        return;
      }
      const outcome = await this.adapters.sendSmtp({
        to: eligibility.address, subject, body, idempotencyKey: row.dedupeKey,
      });
      if (outcome.accepted) {
        await this.finish(id, fence, {
          status: 'SENT', sentAt: new Date(), providerMessageId: outcome.reference ?? null, nextRetryAt: null,
        });
      } else if (outcome.uncertain) {
        await this.finish(id, fence, {
          status: 'FAILED', errorCode: 'OUTCOME_UNCERTAIN',
          errorMessage: 'SMTP outcome unknown; manual reconciliation required', nextRetryAt: null,
        });
      } else if (outcome.retryable && row.attempts < row.maxAttempts) {
        const backoff = Math.min(MAX_BACKOFF_MS, 30_000 * 2 ** Math.max(0, row.attempts - 1));
        await this.finish(id, fence, {
          status: 'FAILED', errorCode: 'PROVIDER_TEMPORARY',
          errorMessage: outcome.reason ?? null, nextRetryAt: new Date(Date.now() + backoff),
        });
      } else {
        await this.finish(id, fence, {
          status: 'FAILED', errorCode: outcome.reason ?? 'PROVIDER_REJECTED', nextRetryAt: null,
        });
      }
    } catch (error) {
      this.logger.error(`Job ${id} failed`, error instanceof Error ? error.stack : String(error));
      // If failure occurred after a potentially ambiguous network operation,
      // conservative manual reconciliation is required before retrying.
      await this.finish(id, fence, { status: 'FAILED', errorCode: 'WORKER_EXCEPTION_RECONCILE', nextRetryAt: null });
    }
  }

  async runOnce(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const now = new Date();
      await this.db.notificationDelivery.updateMany({
        where: {
          status: 'FAILED', errorCode: 'PROVIDER_TEMPORARY',
          nextRetryAt: { lte: now }, channel: 'EMAIL', purpose: 'MARKETING',
        },
        data: { status: 'QUEUED', nextRetryAt: null },
      });
      // Lease expiry after an SMTP submission is ambiguous: never auto resend.
      await this.db.notificationDelivery.updateMany({
        where: { status: 'PROCESSING', lockedUntil: { lte: now } },
        data: {
          status: 'FAILED', lockOwner: null, lockedUntil: null,
          errorCode: 'LEASE_EXPIRED_RECONCILE', nextRetryAt: null,
        },
      });
      const jobs = await this.db.notificationDelivery.findMany({
        where: {
          status: 'QUEUED', channel: 'EMAIL', purpose: 'MARKETING',
          scheduledAt: { lte: now },
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
        },
        select: { id: true, attempts: true, maxAttempts: true },
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }], take: MAX_LOOKUP,
      });
      for (const job of jobs) {
        if (job.attempts >= job.maxAttempts) {
          await this.db.notificationDelivery.updateMany({
            where: { id: job.id, status: 'QUEUED' },
            data: { status: 'FAILED', errorCode: 'ATTEMPTS_EXHAUSTED', nextRetryAt: null },
          });
        } else {
          await this.process(job.id);
        }
      }
    } catch (error) {
      this.logger.error('Worker tick failed', error instanceof Error ? error.stack : String(error));
    } finally {
      this.busy = false;
    }
  }
}
