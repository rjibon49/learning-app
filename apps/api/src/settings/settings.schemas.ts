
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
]);

export const updateSettingSchema = z.object({
  value: z.string().trim().max(255),
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
