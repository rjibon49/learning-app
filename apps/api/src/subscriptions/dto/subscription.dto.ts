import { z } from 'zod';

const PlatformEnum = z.enum(['GOOGLE_PLAY', 'APPLE_APP_STORE', 'STRIPE', 'MANUAL']);
const StatusEnum = z.enum(['ACTIVE', 'TRIALING', 'EXPIRED', 'CANCELED', 'GRACE_PERIOD']);

export const CreateSubscriptionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  appId: z.string().min(1, 'App ID is required'),
  platform: PlatformEnum.default('GOOGLE_PLAY'),
  provider: z.string().min(1, 'Provider is required'),
  productId: z.string().min(1, 'Product ID is required'),
  externalId: z.string().nullable().optional(),
  originalTransactionId: z.string().nullable().optional(),
  status: StatusEnum.default('ACTIVE'),
  startedAt: z.string().transform((val) => new Date(val)),
  expiresAt: z.string().optional().transform((val) => (val ? new Date(val) : null)),
  autoRenew: z.boolean().default(true),
});

export const UpdateSubscriptionSchema = CreateSubscriptionSchema.partial();

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionDto = z.infer<typeof UpdateSubscriptionSchema>;