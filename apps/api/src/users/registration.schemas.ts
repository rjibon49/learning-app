
import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(191));

const phoneNumberSchema = z
  .union([
    z
      .string()
      .trim()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        'Use international phone format, e.g. +8801712345678',
      ),
    z.literal(''),
  ])
  .optional()
  .transform((value) => value || undefined);

const marketingSchema = z
  .strictObject({
    email: z.boolean().default(false),
    whatsapp: z.boolean().default(false),
    sms: z.boolean().default(false),
  })
  .default({
    email: false,
    whatsapp: false,
    sms: false,
  });

export const registerSchema = z.strictObject({
  email: emailSchema,

  displayName: z
    .string()
    .trim()
    .min(2)
    .max(120),

  password: z
    .string()
    .min(12)
    .max(128),

  phoneNumber: phoneNumberSchema,

  marketing: marketingSchema,
});

export const verifyEmailSchema = z.strictObject({
  email: emailSchema,

  code: z
    .string()
    .regex(/^\d{6}$/, 'Code must contain 6 digits'),
});

export type RegisterInput = z.infer<
  typeof registerSchema
>;

export type VerifyEmailInput = z.infer<
  typeof verifyEmailSchema
>;
