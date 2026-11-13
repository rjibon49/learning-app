import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

type SendRequest = { to: string; subject: string; body: string; idempotencyKey: string };
export type ProviderResponse = { accepted: boolean; reference?: string; retryable?: boolean; reason?: string; uncertain?: boolean };

/**
 * SMTP is not an exactly-once protocol. A connection timeout after DATA may
 * mean the message was accepted. Treat ambiguous failures as uncertain and
 * reconcile manually; NEVER automatically retry an uncertain send.
 */
@Injectable()
export class NotificationProviderAdapters {
  constructor(private readonly config: ConfigService) {}

  async sendSmtp(input: SendRequest): Promise<ProviderResponse> {
    if (this.config.get<string>('NOTIFY_EMAIL_SEND_ENABLED', 'false') !== 'true') {
      return { accepted: false, reason: 'EMAIL_ADAPTER_DISABLED' };
    }
    const host = this.config.get<string>('NOTIFY_SMTP_HOST');
    const username = this.config.get<string>('NOTIFY_SMTP_USER');
    const password = this.config.get<string>('NOTIFY_SMTP_PASSWORD');
    const from = this.config.get<string>('NOTIFY_SMTP_FROM');
    const port = Number(this.config.get<string>('NOTIFY_SMTP_PORT', '587'));
    if (!host || !username || !password || !from || !Number.isInteger(port)) {
      return { accepted: false, reason: 'SMTP_NOT_CONFIGURED' };
    }
    const transport = nodemailer.createTransport({
      host, port, secure: port === 465, requireTLS: port !== 465,
      auth: { user: username, pass: password },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });
    try {
      const receipt = await transport.sendMail({
        from, to: input.to, subject: input.subject, text: input.body,
        headers: { 'X-Notification-Dedupe': input.idempotencyKey },
      });
      return { accepted: receipt.accepted.length > 0, reference: receipt.messageId,
        reason: receipt.accepted.length ? undefined : 'SMTP_REJECTED' };
    } catch {
      return { accepted: false, uncertain: true, reason: 'SMTP_OUTCOME_UNKNOWN' };
    } finally {
      transport.close();
    }
  }

  // Paid channels are deliberately inert until policy-compliant adapters are
  // separately implemented and verified. No implicit fallback to SMTP.
  async sendWhatsApp(): Promise<ProviderResponse> {
    return { accepted: false, reason: 'WHATSAPP_NOT_IMPLEMENTED' };
  }
  async sendSms(): Promise<ProviderResponse> {
    return { accepted: false, reason: 'SMS_NOT_IMPLEMENTED' };
  }
}
