import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .transform((value) => value.toLowerCase()),

  password: z.string().min(8).max(200),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
