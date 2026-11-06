import { z } from 'zod';

const AdProviderEnum = z.enum(['ADMOB', 'FACEBOOK', 'STARTAPP', 'UNITY', 'CUSTOM']);

export const CreateAdConfigSchema = z.object({
  appId: z.string().min(1, 'App ID is required'),
  provider: AdProviderEnum.default('ADMOB'),
  platform: z.string().min(1, 'Platform is required (e.g. android, ios)'),
  appAdId: z.string().nullable().optional(),
  bannerAdUnitId: z.string().nullable().optional(),
  interstitialAdUnitId: z.string().nullable().optional(),
  rewardedAdUnitId: z.string().nullable().optional(),
  nativeAdUnitId: z.string().nullable().optional(),
  isEnabled: z.boolean().default(true),
  settings: z.any().optional(),
});

export const UpdateAdConfigSchema = CreateAdConfigSchema.partial();

export type CreateAdConfigDto = z.infer<typeof CreateAdConfigSchema>;
export type UpdateAdConfigDto = z.infer<typeof UpdateAdConfigSchema>;