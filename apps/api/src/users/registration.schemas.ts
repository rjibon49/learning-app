
import { z } from 'zod';

const emailSchema = z
  .email()
  .max(191)
  .transform((value) => value.trim().toLowerCase());

export const registerSchema = z.object({
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
});

export const verifyEmailSchema = z.object({
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
