
import { z } from 'zod';

export const adIdSchema = z.cuid();

const optionalAdUnit = z
  .string()
  .trim()
  .max(255)
  .nullable()
  .optional();

const settingsSchema = z.object({
  bannerEnabled: z.boolean().default(true),
  interstitialEnabled: z.boolean().default(true),
  rewardedEnabled: z.boolean().default(true),
  nativeEnabled: z.boolean().default(true),

  // Prevent excessive interruptions.
  interstitialMinIntervalSeconds: z
    .number().int().min(30).max(86400)
    .default(180),

  maxInterstitialsPerSession: z
    .number().int().min(0).max(50)
    .default(5),
}).strict();

export const CreateAdConfigSchema = z.object({
  appId: adIdSchema,

  // Matches the existing Prisma AdProvider enum.
  provider: z.enum([
    'ADMOB',
    'OTHER',
  ]).default('ADMOB'),

  platform: z.enum([
    'android',
    'ios',
    'web',
  ]),

  appAdId: optionalAdUnit,
  bannerAdUnitId: optionalAdUnit,
  interstitialAdUnitId: optionalAdUnit,
  rewardedAdUnitId: optionalAdUnit,
  nativeAdUnitId: optionalAdUnit,

  isEnabled: z.boolean().default(false),

  settings: settingsSchema.default({
    bannerEnabled: true,
    interstitialEnabled: true,
    rewardedEnabled: true,
    nativeEnabled: true,
    interstitialMinIntervalSeconds: 180,
    maxInterstitialsPerSession: 5,
  }),
}).strict();

export const UpdateAdConfigSchema =
  CreateAdConfigSchema
    .omit({
      appId: true,
      provider: true,
      platform: true,
    })
    .partial()
    .strict();

export const PublicAdQuerySchema = z.object({
  appId: adIdSchema,
  platform: z.enum([
    'android',
    'ios',
    'web',
  ]),
}).strict();

export const AdminAdQuerySchema = z.object({
  appId: adIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100)
    .default(20),
}).strict();

export type CreateAdConfigDto =
  z.infer<typeof CreateAdConfigSchema>;

export type UpdateAdConfigDto =
  z.infer<typeof UpdateAdConfigSchema>;

export type PublicAdQueryDto =
  z.infer<typeof PublicAdQuerySchema>;

export type AdminAdQueryDto =
  z.infer<typeof AdminAdQuerySchema>;
