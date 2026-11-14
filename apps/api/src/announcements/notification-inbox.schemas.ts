
import { z } from 'zod';

export const notificationInboxQuerySchema =
  z.strictObject({
    page: z.coerce.number().int().min(1).max(10)
      .default(1),

    limit: z.coerce.number().int().min(1).max(50)
      .default(20),

    locale: z.string().trim()
      .regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/)
      .default('en'),

    appId: z.string().trim().min(1).max(191)
      .optional(),

    platform: z.enum(['WEB', 'ANDROID', 'IOS'])
      .optional(),
  });

export const notificationIdSchema =
  z.string().trim().min(1).max(191);

export type NotificationInboxQuery =
  z.infer<typeof notificationInboxQuerySchema>;
