import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type OptionalSendResult = { accepted: boolean; messageId?: string; reason?: string; uncertain?: boolean };

/**
 * All optional channels are OFF by default. Providers require verified opt-in,
 * templating, rate/budget controls and webhook integration before enabling.
 * This is provider transport infrastructure, not an authorization to send.
 */
@Injectable()
export class OptionalChannelAdapters {
  constructor(private readonly config: ConfigService) {}
  private allowed(name: string) { return this.config.get<string>(name, 'false') === 'true'; }

  async sendWhatsAppApprovedTemplate(input: {
    phoneE164: string; templateName: string; languageCode: string;
    components: unknown[]; consentVerified: boolean;
  }): Promise<OptionalSendResult> {
    if (!this.allowed('NOTIFY_WHATSAPP_SEND_ENABLED')) return { accepted: false, reason: 'WHATSAPP_DISABLED' };
    if (!input.consentVerified || !/^\+[1-9]\d{7,14}$/.test(input.phoneE164)) return { accepted: false, reason: 'WHATSAPP_CONSENT_OR_NUMBER_INVALID' };
    const token = this.config.get<string>('NOTIFY_META_ACCESS_TOKEN');
    const phoneId = this.config.get<string>('NOTIFY_META_PHONE_NUMBER_ID');
    const version = this.config.get<string>('NOTIFY_META_GRAPH_VERSION', 'v23.0');
    if (!token || !phoneId || !/^v\d+\.\d+$/.test(version)) return { accepted: false, reason: 'WHATSAPP_NOT_CONFIGURED' };
    try {
      const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}/messages`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: input.phoneE164.replace('+',''), type: 'template',
          template: { name: input.templateName, language: { code: input.languageCode }, components: input.components } }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return { accepted: false, reason: `META_HTTP_${response.status}` };
      const payload = await response.json() as { messages?: { id?: string }[] };
      return { accepted: true, messageId: payload.messages?.[0]?.id };
    } catch { return { accepted: false, uncertain: true, reason: 'META_OUTCOME_UNKNOWN' }; }
  }

  async sendFcm(input: { registrationToken: string; title: string; body: string; consentVerified: boolean }): Promise<OptionalSendResult> {
    if (!this.allowed('NOTIFY_FCM_SEND_ENABLED')) return { accepted: false, reason: 'FCM_DISABLED' };
    if (!input.consentVerified) return { accepted: false, reason: 'PUSH_CONSENT_MISSING' };
    const project = this.config.get<string>('NOTIFY_FIREBASE_PROJECT_ID');
    // Access token must be supplied by a separately audited OAuth/service-account token manager.
    const bearer = this.config.get<string>('NOTIFY_FCM_OAUTH_ACCESS_TOKEN');
    if (!project || !bearer) return { accepted: false, reason: 'FCM_TOKEN_MANAGER_NOT_CONFIGURED' };
    try {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(project)}/messages:send`, {
        method: 'POST', headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { token: input.registrationToken, notification: { title: input.title, body: input.body } } }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return { accepted: false, reason: `FCM_HTTP_${response.status}` };
      const data = await response.json() as { name?: string };
      return { accepted: true, messageId: data.name };
    } catch { return { accepted: false, uncertain: true, reason: 'FCM_OUTCOME_UNKNOWN' }; }
  }

  async sendWebPush(): Promise<OptionalSendResult> {
    // Web Push VAPID crypto + subscription endpoint/auth must be integrated
    // with a dedicated implementation (e.g. web-push package) before activation.
    return { accepted: false, reason: 'WEB_PUSH_ADAPTER_NOT_CONFIGURED' };
  }
  async sendSms(): Promise<OptionalSendResult> {
    // No generic carrier endpoint exists. Choose an approved SMS gateway first.
    return { accepted: false, reason: 'SMS_PROVIDER_NOT_CONFIGURED' };
  }
}
