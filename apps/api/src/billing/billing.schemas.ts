import { z } from 'zod';
export const id = z.string().trim().min(1).max(191);
export const cancelRequest = z.strictObject({ reason: z.string().trim().max(500).optional(), idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{16,100}$/) });
export const refundRequest = z.strictObject({ paymentId: id, reason: z.string().trim().min(10).max(2000) });
export const reviewRequest = z.strictObject({ decision: z.enum(['APPROVE','REJECT']), note: z.string().trim().max(2000).optional() });
export const pageQuery = z.strictObject({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
