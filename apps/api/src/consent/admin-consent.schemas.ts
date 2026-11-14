
import { z } from 'zod';

const httpsUrl = z
  .url()
  .max(2000)
  .refine((value) => {
    try {
      const url = new URL(value);

      return (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, 'A valid HTTPS URL is required');

export const createConsentPolicySchema =
  z.strictObject({
    version: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9._-]{2,40}$/),

    title: z
      .string()
      .trim()
      .min(3)
      .max(180),

    documentUrl: httpsUrl,

    // SHA256 of the actual published
    // consent policy document.
    contentHash: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/)
      .transform((value) => value.toLowerCase()),

    effectiveAt: z.iso.datetime().optional(),
  });

export const updateConsentPolicySchema =
  createConsentPolicySchema
    .omit({ version: true })
    .partial();

export const consentPolicyParamsSchema =
  z.strictObject({
    id: z.string().min(1).max(191),
  });

export type CreateConsentPolicyInput =
  z.infer<typeof createConsentPolicySchema>;

export type UpdateConsentPolicyInput =
  z.infer<typeof updateConsentPolicySchema>;
