
import { z } from 'zod';

// =====================================================
// NOTIFICATION CHANNELS
// =====================================================

export const externalChannels = [
  'EMAIL',
  'MOBILE_PUSH',
  'WEB_PUSH',
  'WHATSAPP',
  'SMS',
] as const;

// =====================================================
// SUPPORTED PROVIDERS
// =====================================================

export const providerKeys = [
  'smtp',
  'firebase_fcm',
  'web_push',
  'meta_whatsapp',
  'generic_sms',
] as const;

export type ExternalNotificationChannel =
  (typeof externalChannels)[number];

export type NotificationProviderKey =
  (typeof providerKeys)[number];

// =====================================================
// PROVIDER TO CHANNEL MAPPING
// =====================================================

const PROVIDER_CHANNEL_MAP: Record<
  NotificationProviderKey,
  ExternalNotificationChannel
> = {
  smtp: 'EMAIL',
  firebase_fcm: 'MOBILE_PUSH',
  web_push: 'WEB_PUSH',
  meta_whatsapp: 'WHATSAPP',
  generic_sms: 'SMS',
};

// =====================================================
// SHARED FIELD SCHEMAS
// =====================================================

const displayNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(120);

const credentialRefSchema = z
  .string()
  .trim()
  .regex(
    /^NOTIFY_[A-Z0-9_]{3,160}$/,
    'Use a NOTIFY_ environment secret reference.',
  )
  .nullable()
  .optional();

// No arbitrary settings or credentials accepted.
const providerConfigSchema = z.strictObject({
  senderName: z
    .string()
    .trim()
    .max(120)
    .optional(),

  senderEmail: z
    .email()
    .max(191)
    .optional(),

  region: z
    .string()
    .trim()
    .max(60)
    .optional(),

  templateNamespace: z
    .string()
    .trim()
    .max(100)
    .optional(),

  projectId: z
    .string()
    .trim()
    .max(191)
    .optional(),
});

// =====================================================
// BASE PROVIDER SCHEMA
// =====================================================

// IMPORTANT:
// Keep this schema free of refinements.
// Object operations such as omit() and partial()
// must happen before superRefine() in Zod v4.

const providerBaseSchema = z.strictObject({
  channel: z.enum(externalChannels),

  providerKey: z.enum(providerKeys),

  displayName: displayNameSchema,

  isTestMode: z
    .boolean()
    .default(true),

  // Environment variable name only.
  // Never store API tokens or passwords here.
  credentialRef: credentialRefSchema,

  settings: providerConfigSchema.default({}),
});

// =====================================================
// CREATE PROVIDER
// =====================================================

export const providerSettingsSchema =
  providerBaseSchema.superRefine((value, ctx) => {
    const expectedChannel =
      PROVIDER_CHANNEL_MAP[value.providerKey];

    if (value.channel !== expectedChannel) {
      ctx.addIssue({
        code: 'custom',
        path: ['providerKey'],
        message:
          `Provider "${value.providerKey}" ` +
          `requires channel "${expectedChannel}".`,
      });
    }
  });

// =====================================================
// UPDATE PROVIDER
// =====================================================

// Only editable fields are included.
// Channel and providerKey are immutable.
//
// Derived from the unrefined base schema,
// preventing Zod v4 runtime errors.

export const providerSettingsUpdateSchema =
  providerBaseSchema
    .omit({
      channel: true,
      providerKey: true,
    })
    .partial()
    .refine(
      (value) =>
        Object.keys(value).length > 0,
      {
        message:
          'At least one setting must be provided.',
      },
    );

// =====================================================
// PROVIDER ID VALIDATION
// =====================================================

export const providerIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(191);

// =====================================================
// INFERRED TYPES
// =====================================================

export type CreateProviderSettingsInput =
  z.infer<typeof providerSettingsSchema>;

export type UpdateProviderSettingsInput =
  z.infer<typeof providerSettingsUpdateSchema>;
