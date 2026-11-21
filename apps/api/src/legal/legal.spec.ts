import { describe, expect, it } from 'vitest';

import { DEFAULT_PRIVACY_MD, legalPage, renderMarkdown } from './legal.pages.js';
import { validateSettingValue } from '../settings/settings.schemas.js';

const ctx = {
  company: 'Visual Sage Agency',
  email: 'hello@visualsage.agency',
  website: 'https://visualsage.agency',
  address: '',
  updated: '21 November 2026',
  app: 'German A1',
};

describe('legal pages', () => {
  it('fills placeholders into the default privacy text', () => {
    const html = legalPage('Privacy policy', DEFAULT_PRIVACY_MD, ctx);
    expect(html).toContain('Visual Sage Agency');
    expect(html).toContain('href="mailto:hello@visualsage.agency"');
    expect(html).not.toContain('{{');
  });

  it('escapes HTML written in the CMS', () => {
    const html = renderMarkdown('Hi <script>alert(1)</script> **bold**');
    expect(html).not.toContain('<script>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('validates legal settings', () => {
    expect(() => validateSettingValue('LEGAL_CONTACT_EMAIL', 'not-an-email')).toThrow();
    expect(validateSettingValue('LEGAL_WEBSITE', 'https://visualsage.agency')).toBe('https://visualsage.agency');
    expect(() => validateSettingValue('LEGAL_COMPANY_NAME', 'x'.repeat(300))).toThrow();
    expect(validateSettingValue('PRIVACY_POLICY_TEXT', 'x'.repeat(5000))).toHaveLength(5000);
  });
});
