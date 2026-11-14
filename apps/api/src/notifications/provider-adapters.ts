import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

type SendRequest = { to: string; subject: string; body: string; idempotencyKey: string };
export type ProviderResponse = {
  accepted: boolean;
  reference?: string;
  retryable?: boolean;
  reason?: string;
  uncertain?: boolean;
};

/** SMTP is not an exactly-once protocol. Ambiguous network failures must never be auto-retried. */
@Injectable()
export class NotificationProviderAdapters {
  constructor(private readonly config: ConfigService) {}

  async sendSmtp(input: SendRequest): Promise<ProviderResponse> {
    if (this.config.get<string>('NOTIFY_EMAIL_SEND_ENABLED', 'false') !== 'true') {
      return { accepted: false, reason: 'EMAIL_ADAPTER_DISABLED' };
    }
    const host = this.config.get<string>('NOTIFY_SMTP_HOST');
    const user = this.config.get<string>('NOTIFY_SMTP_USER');
    const password = this.config.get<string>('NOTIFY_SMTP_PASSWORD');
    const from = this.config.get<string>('NOTIFY_SMTP_FROM');
    const port = Number(this.config.get<string>('NOTIFY_SMTP_PORT', '587'));
    if (!host || !user || !password || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
      return { accepted: false, reason: 'SMTP_NOT_CONFIGURED' };
    }
    const transport = nodemailer.createTransport({
      host, port, secure: port === 465, requireTLS: port !== 465,
      auth: { user, pass: password },
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    });
    try {
      const receipt = await transport.sendMail({
        from, to: input.to, subject: input.subject, text: input.body,
        headers: { 'X-Notification-Dedupe': input.idempotencyKey },
      });
      const accepted = receipt.accepted.some(address => address.toLowerCase() === input.to.toLowerCase());
      return { accepted, reference: receipt.messageId, reason: accepted ? undefined : 'SMTP_REJECTED' };
    } catch {
      // A disconnect can occur after SMTP DATA was accepted. This is outcome-uncertain.
      return { accepted: false, uncertain: true, reason: 'SMTP_OUTCOME_UNKNOWN' };
    } finally {
      transport.close();
    }
  }

  async sendWhatsApp(): Promise<ProviderResponse> {
    return { accepted: false, reason: 'WHATSAPP_NOT_IMPLEMENTED' };
  }

  async sendSms(): Promise<ProviderResponse> {
    return { accepted: false, reason: 'SMS_NOT_IMPLEMENTED' };
  }
}
