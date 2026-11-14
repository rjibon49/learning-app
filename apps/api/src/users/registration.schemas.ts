import { z } from 'zod';
const email = z.string().trim().toLowerCase().pipe(z.email().max(191));
const phone = z.union([z.string().trim().regex(/^\+[1-9]\d{7,14}$/), z.literal('')])
  .optional().transform(value => value || undefined);
export const registerSchema = z.strictObject({
  email,
  displayName: z.string().trim().min(2).max(120),
  password: z.string().min(12).max(128),
  phoneNumber: phone,
  marketing: z.strictObject({
    email: z.boolean().default(false), whatsapp: z.boolean().default(false), sms: z.boolean().default(false),
  }).default({ email: false, whatsapp: false, sms: false }),
});
export const verifyEmailSchema = z.strictObject({
  email, code: z.string().regex(/^\d{6}$/),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
