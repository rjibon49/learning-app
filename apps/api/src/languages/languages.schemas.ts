
import { z } from 'zod';

export const languageCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/,
    'Invalid language code',
  )
  .max(16);

export const frameworkCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{2,32}$/);

export const createLanguageSchema = z.object({
  code: languageCodeSchema,

  name: z.string().trim().min(2).max(100),

  nativeName: z.string().trim().min(1).max(100),

  direction: z.enum(['LTR', 'RTL']).default('LTR'),

  isActive: z.boolean().default(true),

  sortOrder: z.number().int().min(0).default(0),
}).strict();

export const updateLanguageSchema =
  createLanguageSchema
    .omit({ code: true })
    .partial()
    .strict();

export const assignLevelsSchema = z.object({
  frameworkCode: frameworkCodeSchema,

  levelCodes: z
    .array(z.string().trim().min(1).max(32))
    .min(1)
    .max(30)
    .refine(
      (values) => new Set(values).size === values.length,
      'Duplicate levels are not allowed',
    ),
}).strict();

export type CreateLanguageInput =
  z.infer<typeof createLanguageSchema>;

export type UpdateLanguageInput =
  z.infer<typeof updateLanguageSchema>;

export type AssignLevelsInput =
  z.infer<typeof assignLevelsSchema>;
