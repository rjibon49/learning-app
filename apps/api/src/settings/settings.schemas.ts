
import { z } from 'zod';

export const settingKeySchema = z.enum([
  'SUBSCRIPTION_MONTHLY_USD_CENTS',
  'SUBSCRIPTION_YEARLY_USD_CENTS',
  'DAILY_MINUTES_REQUIRED',
  'STREAK_REQUIRED_DAYS',
  'STREAK_REWARD_DAYS',
  'MAINTENANCE_MODE',
  'DEFAULT_LOCALE',
  'REGISTRATION_ENABLED',
  // Legal pages (/api/legal/privacy, /api/legal/terms)
  'LEGAL_COMPANY_NAME',
  'LEGAL_CONTACT_EMAIL',
  'LEGAL_WEBSITE',
  'LEGAL_ADDRESS',
  'LEGAL_APP_NAME',
  'PRIVACY_POLICY_TEXT',
  'TERMS_OF_USE_TEXT',
]);

/** Settings that hold long Markdown text instead of a short value. */
export const LONG_TEXT_SETTINGS = new Set<string>(['PRIVACY_POLICY_TEXT', 'TERMS_OF_USE_TEXT']);

export const updateSettingSchema = z.object({
  // Short values are limited to 255 characters in validateSettingValue.
  value: z.string().trim().max(100000),
  description: z.string()
    .trim()
    .max(1000)
    .optional(),
}).strict();

export type SettingKey = z.infer<typeof settingKeySchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;

export function validateSettingValue(
  key: SettingKey,
  value: string,
): string {
  if (LONG_TEXT_SETTINGS.has(key)) {
    if (!value) throw new Error('Text must not be empty (use Reset to go back to the default)');
    return value;
  }

  if (value.length > 255) {
    throw new Error('Value must be at most 255 characters');
  }

  if (key === 'LEGAL_CONTACT_EMAIL') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Enter a valid email address');
    return value;
  }

  if (key === 'LEGAL_WEBSITE') {
    if (!/^https?:\/\/[^\s]+\.[^\s]+$/.test(value)) throw new Error('Enter a full URL starting with https://');
    return value;
  }

  if (key === 'LEGAL_COMPANY_NAME' || key === 'LEGAL_ADDRESS' || key === 'LEGAL_APP_NAME') {
    if (!value) throw new Error('Enter a value');
    return value;
  }

  if (
    key === 'MAINTENANCE_MODE' ||
    key === 'REGISTRATION_ENABLED'
  ) {
    if (value !== 'true' && value !== 'false') {
      throw new Error('Value must be true or false');
    }
    return value;
  }

  if (key === 'DEFAULT_LOCALE') {
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value)) {
      throw new Error('Invalid locale');
    }
    return value;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error('Value must be an integer');
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number)) {
    throw new Error('Invalid numeric value');
  }

  const ranges: Record<string, [number, number]> = {
    SUBSCRIPTION_MONTHLY_USD_CENTS: [1, 100000000],
    SUBSCRIPTION_YEARLY_USD_CENTS: [1, 100000000],
    DAILY_MINUTES_REQUIRED: [1, 240],
    STREAK_REQUIRED_DAYS: [1, 365],
    STREAK_REWARD_DAYS: [0, 30],
  };

  const [min, max] = ranges[key];

  if (number < min || number > max) {
    throw new Error(`Value must be between ${min} and ${max}`);
  }

  return String(number);
}
