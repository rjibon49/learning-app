
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

/** Mobile apps send the refresh token in the body instead of a cookie. */
export const refreshBodySchema = z
  .object({
    refreshToken: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12).max(128),
  })
  .strict()
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current one',
  });

export const deleteAccountSchema = z
  .object({
    password: z.string().min(1).max(128),
  })
  .strict();

export type LoginInput =
  z.infer<typeof loginSchema>;

export type ForgotPasswordInput =
  z.infer<typeof forgotPasswordSchema>;

export type ResetPasswordInput =
  z.infer<typeof resetPasswordSchema>;
