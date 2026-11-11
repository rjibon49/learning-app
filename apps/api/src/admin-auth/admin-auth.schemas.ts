
import { z } from 'zod';

export const adminLoginSchema = z
  .object({
    email: z
      .email()
      .trim()
      .toLowerCase()
      .max(191),

    password: z
      .string()
      .min(1)
      .max(200),
  })
  .strict();

export type AdminLoginInput =
  z.infer<typeof adminLoginSchema>;
