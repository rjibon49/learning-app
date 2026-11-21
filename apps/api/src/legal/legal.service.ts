import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma.service.js';
import { DEFAULT_PRIVACY_MD, DEFAULT_TERMS_MD, fill, legalPage, type LegalContext } from './legal.pages.js';

/** CMS settings (Settings → Legal pages) that shape the legal pages. */
export const LEGAL_SETTING_KEYS = [
  'LEGAL_COMPANY_NAME',
  'LEGAL_CONTACT_EMAIL',
  'LEGAL_WEBSITE',
  'LEGAL_ADDRESS',
  'LEGAL_APP_NAME',
  'PRIVACY_POLICY_TEXT',
  'TERMS_OF_USE_TEXT',
] as const;

@Injectable()
export class LegalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async load() {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: [...LEGAL_SETTING_KEYS] } },
      select: { key: true, value: true, updatedAt: true },
    });
    const value = (key: string) => rows.find((r) => r.key === key)?.value.trim() || '';
    const textRow = (key: string) => rows.find((r) => r.key === key && r.value.trim());

    const ctx = (textKey: string): LegalContext => {
      const latest = rows.reduce<Date | null>((d, r) => (!d || r.updatedAt > d ? r.updatedAt : d), null);
      const updated = textRow(textKey)?.updatedAt ?? latest ?? new Date('2026-11-21');
      return {
        company: value('LEGAL_COMPANY_NAME') || 'Visual Sage Agency',
        email: value('LEGAL_CONTACT_EMAIL') || this.config.get<string>('LEGAL_CONTACT_EMAIL') || 'rjibon49@gmail.com',
        website: value('LEGAL_WEBSITE') || 'https://visualsage.agency',
        address: value('LEGAL_ADDRESS'),
        app: value('LEGAL_APP_NAME') || 'German A1',
        updated: updated.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      };
    };
    return { value, ctx };
  }

  async privacyHtml() {
    const { value, ctx } = await this.load();
    return legalPage('Privacy policy', value('PRIVACY_POLICY_TEXT') || DEFAULT_PRIVACY_MD, ctx('PRIVACY_POLICY_TEXT'));
  }

  async termsHtml() {
    const { value, ctx } = await this.load();
    return legalPage('Terms of use', value('TERMS_OF_USE_TEXT') || DEFAULT_TERMS_MD, ctx('TERMS_OF_USE_TEXT'));
  }

  /** For the apps: the filled-in Markdown, shown on a native screen. */
  async content(doc: 'privacy' | 'terms') {
    const { value, ctx } = await this.load();
    const key = doc === 'privacy' ? 'PRIVACY_POLICY_TEXT' : 'TERMS_OF_USE_TEXT';
    const c = ctx(key);
    const markdown = fill(value(key) || (doc === 'privacy' ? DEFAULT_PRIVACY_MD : DEFAULT_TERMS_MD), c)
      .replace(/\n{3,}/g, '\n\n')
      // Keep single line breaks (e.g. the contact block) in Markdown renderers.
      .replace(/([^\n])\n(?!\n|\s*[-*] |#|\s*\d+[.)] )/g, '$1  \n');
    return {
      title: doc === 'privacy' ? 'Privacy policy' : 'Terms of use',
      company: c.company,
      updated: c.updated,
      markdown,
    };
  }
}
