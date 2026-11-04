import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PORT: z.coerce.number().int().min(1024).max(65535).default(4000),

  API_PREFIX: z.string().trim().min(1).default('api'),

  CORS_ORIGINS: z
    .string()
    .trim()
    .default('http://localhost:3000,http://localhost:3001'),

  DATABASE_URL: z.string().trim().min(1),

  ADMIN_JWT_SECRET: z.string().min(32),
  ADMIN_ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(300)
    .max(3600)
    .default(900),
  ADMIN_REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  ADMIN_JWT_ISSUER: z.string().trim().min(1).default('learning-api'),
  ADMIN_JWT_AUDIENCE: z.string().trim().min(1).default('learning-admin'),
});

export type EnvConfig = z.infer<typeof envSchema>;
