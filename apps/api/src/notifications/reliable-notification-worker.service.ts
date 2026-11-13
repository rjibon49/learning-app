import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';
import { DeliveryPolicyService } from './delivery-policy.service.js';
import { NotificationProviderAdapters } from './provider-adapters.js';
import { UnsubscribeService } from './unsubscribe.service.js';

const LEASE_MS = 120_000;
const MAX_LOOKUP = 30;

@Injectable()
export class ReliableNotificationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReliableNotificationWorkerService.name);
  private interval?: ReturnType<typeof setInterval>;
  private busy = false;
  private readonly owner = randomUUID();
  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
    private readonly policy: DeliveryPolicyService,
    private readonly adapters: NotificationProviderAdapters,
    private readonly unsubscribe: UnsubscribeService,
  ) {}

  onModuleInit() {
    // Run in ONE isolated worker process only, never in all API replicas.
    if (this.config.get<string>('NOTIFICATION_DELIVERY_WORKER_ENABLED', 'false') !== 'true') return;
    this.interval = setInterval(() => { void this.runOnce(); }, 15_000);
    void this.runOnce();
  }
  onModuleDestroy() { if (this.interval) clearInterval(this.interval); }

  private async claim(id: string) {
    const now = new Date();
    const lease = new Date(now.getTime() + LEASE_MS);
    const job = await this.db.notificationDelivery.findUnique({ where: { id }, select: { attempts: true, maxAttempts: true } });
    if (!job || job.attempts >= job.maxAttempts) return null;
    const changed = await this.db.notificationDelivery.updateMany({
      where: { id, status: 'QUEUED', attempts: { lt: job.maxAttempts }, scheduledAt: { lte: now },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] },
      data: { status: 'PROCESSING', lockOwner: this.owner, lockedUntil: lease,
        claimVersion: { increment: 1 }, attempts: { increment: 1 } },
    });
    if (changed.count !== 1) return null;
    return this.db.notificationDelivery.findFirst({ where: { id, lockOwner: this.owner, status: 'PROCESSING' },
      include: { template: { include: { translations: true, providerConfig: true } } } });
  }

  private async finish(id: string, claimVersion: number, patch: {
    status: 'SENT' | 'FAILED' | 'SKIPPED'; errorCode?: string | null;
    errorMessage?: string | null; providerMessageId?: string | null;
    sentAt?: Date | null; nextRetryAt?: Date | null;
  }) {
    const result = await this.db.notificationDelivery.updateMany({
      where: { id, lockOwner: this.owner, claimVersion, status: 'PROCESSING', lockedUntil: { gt: new Date() } },
      data: { ...patch, lockOwner: null, lockedUntil: null },
    });
    if (result.count !== 1) this.logger.warn(`Lost lease for ${id}; do not blindly retry`);
  }

  private render(text: string | null, vars: Record<string, string>): string {
    return (text ?? '').replace(/{{\s*([a-z][a-zA-Z0-9_]*)\s*}}/g, (_matched: string, k: string) => {
      if (!Object.hasOwn(vars, k)) throw new Error('MISSING_TEMPLATE_VARIABLE');
      return vars[k];
    });
  }

  private async process(id: string) {
    const row = await this.claim(id);
    if (!row) return;
    const fence = row.claimVersion;
    const skip = async (code: string) => this.finish(id, fence, { status: 'SKIPPED', errorCode: code });
    try {
      // Fail-closed: only email marketing is wired in this phase.
      if (row.channel !== 'EMAIL' || row.purpose !== 'MARKETING' || !row.userId || !row.template) {
        await skip('CHANNEL_NOT_READY'); return;
      }
      const t = row.template;
      if (!t.isActive || t.channel !== row.channel || t.purpose !== row.purpose) {
        await skip('TEMPLATE_INACTIVE'); return;
      }
      const provider = t.providerConfig;
      if (!provider || !provider.isEnabled || provider.isTestMode || provider.providerKey !== 'smtp' ||
          this.config.get<string>('NOTIFY_EMAIL_SEND_ENABLED', 'false') !== 'true') {
        // Requeue without sending; do not exhaust retry attempts while provider is disabled.
        await this.db.notificationDelivery.updateMany({
          where: { id, lockOwner: this.owner, claimVersion: fence, status: 'PROCESSING' },
          data: { status: 'QUEUED', lockOwner: null, lockedUntil: null,
            attempts: { decrement: 1 }, nextRetryAt: new Date(Date.now() + 60 * 60 * 1000) },
        });
        return;
      }
      const eligibility = await this.policy.evaluate(row.userId, 'EMAIL', 'MARKETING');
      if (!eligibility.allowed) { await skip(eligibility.reason); return; }
      const payload = row.payloadJson;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) { await skip('INVALID_PAYLOAD'); return; }
      const value = payload as Record<string, unknown>;
      const locale = typeof value.locale === 'string' ? value.locale.toLowerCase() : 'en';
      const raw = value.variables;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
          !Object.values(raw).every(x => typeof x === 'string')) { await skip('INVALID_VARIABLES'); return; }
      const vars = raw as Record<string, string>;
      const translation = t.translations.find(x => x.locale.toLowerCase() === locale) ||
        t.translations.find(x => x.locale.toLowerCase() === 'en');
      if (!translation) { await skip('MISSING_TRANSLATION'); return; }
      const subject = this.render(translation.title, vars);
      const messageBody = this.render(translation.body, vars);
      const publicBase = this.config.get<string>('NOTIFY_PUBLIC_BASE_URL');
      if (!publicBase || !publicBase.startsWith('https://')) { await skip('UNSUBSCRIBE_BASE_NOT_CONFIGURED'); return; }
      const body = messageBody + `\n\nStop marketing emails: ${publicBase.replace(/\/$/, '')}/unsubscribe?token=${encodeURIComponent(this.unsubscribe.sign(row.userId))}`;
      if (body.length > 10000 || subject.length > 220) { await skip('RENDER_LENGTH_EXCEEDED'); return; }
      // Consent immediately prior to provider call. Disable sending until
      // unsubscribed recipients can reliably use signed one-click opt-out.
      if (this.config.get<string>('NOTIFY_UNSUBSCRIBE_READY', 'false') !== 'true') {
        await skip('UNSUBSCRIBE_NOT_READY'); return;
      }
      const outcome = await this.adapters.sendSmtp({ to: eligibility.address, subject, body, idempotencyKey: row.dedupeKey });
      if (outcome.accepted) {
        await this.finish(id, fence, { status: 'SENT', sentAt: new Date(), providerMessageId: outcome.reference ?? null });
      } else if (outcome.uncertain) {
        await this.finish(id, fence, { status: 'FAILED', errorCode: 'OUTCOME_UNCERTAIN', errorMessage: 'Manual reconciliation required' });
      } else {
        const backoff = Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.max(0, row.attempts - 1));
        await this.finish(id, fence, { status: 'FAILED', errorCode: outcome.retryable ? 'PROVIDER_TEMPORARY' : (outcome.reason ?? 'PROVIDER_REJECTED'),
          nextRetryAt: row.attempts < row.maxAttempts ? new Date(Date.now() + backoff) : null });
      }
    } catch (error) {
      this.logger.error(`Processing failure ${id}`, error instanceof Error ? error.stack : undefined);
      await this.finish(id, fence, { status: 'FAILED', errorCode: 'WORKER_EXCEPTION' });
    }
  }

  async runOnce() {
    if (this.busy) return;
    this.busy = true;
    try {
      const now = new Date();
      // Retry only explicit, deterministic provider rejections with a retry schedule.
      // Never retry an uncertain SMTP outcome or expired lease automatically.
      await this.db.notificationDelivery.updateMany({
        where: { status: 'FAILED', errorCode: 'PROVIDER_TEMPORARY', nextRetryAt: { lte: now },
          channel: 'EMAIL', purpose: 'MARKETING' },
        data: { status: 'QUEUED', nextRetryAt: null },
      });
      // Ambiguous sends after worker crashes must not be retried automatically.
      await this.db.notificationDelivery.updateMany({
        where: { status: 'PROCESSING', lockedUntil: { lt: now } },
        data: { status: 'FAILED', lockOwner: null, lockedUntil: null, errorCode: 'LEASE_EXPIRED_RECONCILE' },
      });
      const due = await this.db.notificationDelivery.findMany({
        where: { status: 'QUEUED', channel: 'EMAIL', purpose: 'MARKETING', scheduledAt: { lte: now },
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] },
        select: { id: true, attempts: true, maxAttempts: true },
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }], take: MAX_LOOKUP,
      });
      for (const job of due) {
        if (job.attempts >= job.maxAttempts) {
          await this.db.notificationDelivery.updateMany({
            where: { id: job.id, status: 'QUEUED' }, data: { status: 'FAILED', errorCode: 'ATTEMPTS_EXHAUSTED' },
          });
          continue;
        }
        await this.process(job.id);
      }
    } catch (error) {
      this.logger.error('Queue worker tick failed', error instanceof Error ? error.stack : String(error));
    } finally { this.busy = false; }
  }
}
