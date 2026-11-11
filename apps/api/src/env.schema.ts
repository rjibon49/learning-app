
import { z } from 'zod';

const requiredText = z.string().trim().min(1);

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),

    HOST: z.string().trim().min(1).default('0.0.0.0'),

    PORT: z.coerce
      .number()
      .int()
      .min(1024)
      .max(65535)
      .default(4000),

    API_PREFIX: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/)
      .default('api'),

    CORS_ORIGINS: z
      .string()
      .trim()
      .default(
        'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001',
      )
      .transform((value): string[] =>
        value
          .split(',')
          .map((origin: string) => origin.trim())
          .filter(Boolean),
      ),

    DATABASE_URL: requiredText,

    ADMIN_JWT_SECRET: z.string().min(32),

    ADMIN_ACCESS_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(300)
      .max(3600)
      .default(900),

    ADMIN_REFRESH_TOKEN_DAYS: z.coerce
      .number()
      .int()
      .min(1)
      .max(90)
      .default(7),

    ADMIN_JWT_ISSUER: z
      .string()
      .trim()
      .min(1)
      .default('learning-api'),

    ADMIN_JWT_AUDIENCE: z
      .string()
      .trim()
      .min(1)
      .default('learning-admin'),

    HTTP_BODY_LIMIT: z
      .string()
      .trim()
      .regex(/^\d+(kb|mb)$/i)
      .default('1mb'),

    // =========================================
    // Cloudflare R2 Storage
    // =========================================

    R2_ACCOUNT_ID: requiredText,

    R2_ACCESS_KEY_ID: requiredText,

    R2_SECRET_ACCESS_KEY: requiredText,

    R2_BUCKET_NAME: requiredText,

    R2_PUBLIC_URL: z
      .string()
      .trim()
      .url()
      .refine(
        (value) => value.startsWith('https://'),
        'R2_PUBLIC_URL must use HTTPS',
      ),
  })
  .passthrough()
  .superRefine((env, ctx) => {
    if (
      env.NODE_ENV === 'production' &&
      env.CORS_ORIGINS.length === 0
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message: 'At least one production origin is required',
      });
    }

    for (const origin of env.CORS_ORIGINS) {
      try {
        const url = new URL(origin);

        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.origin !== origin ||
          (env.NODE_ENV === 'production' &&
            url.protocol !== 'https:')
        ) {
          throw new Error('Invalid origin');
        }
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['CORS_ORIGINS'],
          message: `Invalid CORS origin: ${origin}`,
        });
      }
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;
