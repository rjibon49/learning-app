
import { z } from 'zod';

const email = z
  .email()
  .max(191)
  .transform((value) => value.trim().toLowerCase());

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
}).strict();

export const forgotPasswordSchema = z.object({
  email,
}).strict();

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .regex(/^[a-f0-9]{64}$/i),

  newPassword: z
    .string()
    .min(12)
    .max(128),
}).strict();

export type LoginInput =
  z.infer<typeof loginSchema>;

export type ForgotPasswordInput =
  z.infer<typeof forgotPasswordSchema>;

export type ResetPasswordInput =
  z.infer<typeof resetPasswordSchema>;
