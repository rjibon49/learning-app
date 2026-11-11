
import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const nullableUrl = z
  .url()
  .max(2048)
  .refine((url) => url.startsWith('https://'))
  .nullable();

const nullableIdentifier = z
  .string()
  .trim()
  .min(3)
  .max(255)
  .regex(/^[A-Za-z][A-Za-z0-9_.-]+$/)
  .nullable();

const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .nullable();

const localeSchema = z
  .string()
  .trim()
  .regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/)
  .max(35);

export const appSlugSchema = slugSchema;

export const createAppSchema = z
  .object({
    languageId: z.cuid(),

    levelId: z.cuid().nullable().optional(),

    name: z.string().trim().min(2).max(150),

    slug: slugSchema,

    description: z
      .string()
      .trim()
      .max(5000)
      .nullable()
      .optional(),

    packageName: nullableIdentifier.optional(),

    bundleId: nullableIdentifier.optional(),

    iconUrl: nullableUrl.optional(),

    primaryColor: colorSchema.optional(),

    secondaryColor: colorSchema.optional(),

    isActive: z.boolean().default(true),
  })
  .strict();

export const updateAppSchema = createAppSchema
  .omit({
    languageId: true,
    slug: true,
  })
  .partial()
  .extend({
    // Language and slug are intentionally immutable
    // after creation.
    levelId: z.cuid().nullable().optional(),
  })
  .strict();

export const appConfigSchema = z
  .object({
    adsEnabled: z.boolean().optional(),

    subscriptionsEnabled: z.boolean().optional(),

    guestModeEnabled: z.boolean().optional(),

    loginRequired: z.boolean().optional(),

    defaultLanguage: localeSchema.optional(),

    supportedLanguages: z
      .array(localeSchema)
      .min(1)
      .max(30)
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.supportedLanguages ||
      new Set(value.supportedLanguages).size ===
        value.supportedLanguages.length,
    {
      message: 'Duplicate locale codes are not allowed',
      path: ['supportedLanguages'],
    },
  );

export const appListQuerySchema = z.object({
  language: z.string().trim().toLowerCase().optional(),

  level: z.string().trim().toUpperCase().optional(),

  search: z.string().trim().max(100).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});

export type CreateAppInput =
  z.infer<typeof createAppSchema>;

export type UpdateAppInput =
  z.infer<typeof updateAppSchema>;

export type AppConfigInput =
  z.infer<typeof appConfigSchema>;

export type AppListQuery =
  z.infer<typeof appListQuerySchema>;
