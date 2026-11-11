
import { z } from 'zod';

export const promotionIdSchema = z.cuid();

export const promoCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(4)
  .max(40)
  .regex(/^[A-Z0-9_-]+$/);

export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(6)
  .max(20)
  .regex(/^[A-Z0-9]+$/);

export const createPromoSchema = z.object({
  code: promoCodeSchema,
  discountPct: z.number().int().min(1).max(100),
  description: z.string().trim().max(5000)
    .nullable().optional(),
  isActive: z.boolean().default(false),
  validFrom: z.iso.datetime({ offset: true })
    .nullable().optional(),
  validUntil: z.iso.datetime({ offset: true })
    .nullable().optional(),
  maxUses: z.number().int().min(1).max(1000000)
    .nullable().optional(),
}).strict();

export const updatePromoSchema = createPromoSchema
  .omit({ code: true })
  .partial()
  .strict();

export const setPromoStatusSchema = z.object({
  isActive: z.boolean(),
}).strict();

export const applyReferralSchema = z.object({
  code: referralCodeSchema,
}).strict();

export const promoListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100)
    .default(20),
}).strict();

export type CreatePromoDto =
  z.infer<typeof createPromoSchema>;
export type UpdatePromoDto =
  z.infer<typeof updatePromoSchema>;
export type ApplyReferralDto =
  z.infer<typeof applyReferralSchema>;
export type PromoListDto =
  z.infer<typeof promoListSchema>;
