
import { z } from 'zod';

export const publicAnnouncementQuerySchema =
  z.strictObject({
    channel: z.enum([
      'WEBSITE_BANNER',
      'IN_APP',
    ]),

    placementKey: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9_-]{1,99}$/),

    appId: z.string().min(1).max(191).optional(),

    languageId: z.string().min(1).max(191).optional(),

    levelId: z.string().min(1).max(191).optional(),

    platform: z
      .enum(['WEB', 'ANDROID', 'IOS'])
      .optional(),

    locale: z
      .string()
      .trim()
      .regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/)
      .default('en'),
  });

export type PublicAnnouncementQuery =
  z.infer<typeof publicAnnouncementQuerySchema>;
