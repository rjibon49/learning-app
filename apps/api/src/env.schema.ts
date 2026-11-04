import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce
    .number()
    .int()
    .min(1024)
    .max(65535)
    .default(4000),

  API_PREFIX: z
    .string()
    .trim()
    .min(1)
    .default('api'),

  CORS_ORIGINS: z
    .string()
    .trim()
    .default('http://localhost:3000,http://localhost:3001'),

  DATABASE_URL: z
    .string()
    .trim()
    .min(1),
});

export type EnvConfig = z.infer<typeof envSchema>;