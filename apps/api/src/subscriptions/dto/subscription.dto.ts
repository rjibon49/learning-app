
import { z } from 'zod';

export const subscriptionIdSchema = z.cuid();

export const checkoutSchema = z.object({
  appId: subscriptionIdSchema,

  planType: z.enum([
    'MONTHLY',
    'YEARLY',
  ]),

  // Generated once by the frontend/mobile client.
  // Reuse it if the same request is retried.
  checkoutRequestId: z.uuid(),
}).strict();

export const subscriptionListSchema = z.object({
  appId: subscriptionIdSchema.optional(),

  status: z.enum([
    'PENDING',
    'ACTIVE',
    'EXPIRED',
    'CANCELLED',
    'TRIAL',
    'REFUNDED',
  ]).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100)
    .default(20),
}).strict();

export type CheckoutDto =
  z.infer<typeof checkoutSchema>;

export type SubscriptionListDto =
  z.infer<typeof subscriptionListSchema>;
