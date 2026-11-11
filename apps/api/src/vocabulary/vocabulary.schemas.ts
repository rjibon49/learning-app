
import { z } from 'zod';

export const vocabularyIdSchema = z.cuid();

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const nullableId = vocabularyIdSchema.nullable().optional();

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const sortOrder = z.number().int().min(0).max(1000000);

const publicationStatus = z.enum([
  'DRAFT',
  'REVIEW',
  'PUBLISHED',
  'ARCHIVED',
]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug,
  description: nullableText(10000),
  sortOrder: sortOrder.default(0),
  isActive: z.boolean().default(true),
}).strict();

export const updateCategorySchema =
  createCategorySchema.partial().strict();

export const categoryTranslationSchema = z.object({
  languageId: vocabularyIdSchema,
  name: z.string().trim().min(1).max(120),
  description: nullableText(10000),
}).strict();

export const createVocabularySchema = z.object({
  languageId: vocabularyIdSchema,
  lessonId: nullableId,
  categoryId: nullableId,

  term: z.string().trim().min(1).max(500),

  pronunciation: nullableText(500),
  partOfSpeech: nullableText(80),

  // Examples:
  // { "gender": "masculine", "article": "der" }
  // { "plural": "Bären" }
  // { "script": "kanji" }
  grammar: z.record(
    z.string(),
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(z.string()),
    ]),
  ).nullable().optional(),

  difficulty: z.enum([
    'EASY',
    'MEDIUM',
    'HARD',
  ]).default('EASY'),

  status: publicationStatus.default('DRAFT'),
  notes: nullableText(10000),

  imageAssetId: nullableId,
  audioAssetId: nullableId,
}).strict();

export const updateVocabularySchema =
  createVocabularySchema
    .omit({ languageId: true })
    .partial()
    .strict();

export const vocabularyTranslationSchema = z.object({
  languageId: vocabularyIdSchema,
  meaning: z.string().trim().min(1).max(10000),
  notes: nullableText(10000),
  sortOrder: sortOrder.default(0),
}).strict();

export const vocabularyExampleSchema = z.object({
  languageId: vocabularyIdSchema,
  text: z.string().trim().min(1).max(10000),
  translationGroupId: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .nullable()
    .optional(),
  sortOrder: sortOrder.default(0),
}).strict();

export const updateVocabularyExampleSchema =
  vocabularyExampleSchema.partial().strict();

export const vocabularyListQuerySchema = z.object({
  language: z.string()
    .trim()
    .toLowerCase()
    .max(16)
    .optional(),

  languageId: vocabularyIdSchema.optional(),
  appId: vocabularyIdSchema.optional(),
  lessonId: vocabularyIdSchema.optional(),
  categoryId: vocabularyIdSchema.optional(),

  difficulty: z.enum([
    'EASY',
    'MEDIUM',
    'HARD',
  ]).optional(),

  status: publicationStatus.optional(),

  search: z.string().trim().max(100).optional(),

  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export type CreateCategoryInput =
  z.infer<typeof createCategorySchema>;

export type UpdateCategoryInput =
  z.infer<typeof updateCategorySchema>;

export type CategoryTranslationInput =
  z.infer<typeof categoryTranslationSchema>;

export type CreateVocabularyInput =
  z.infer<typeof createVocabularySchema>;

export type UpdateVocabularyInput =
  z.infer<typeof updateVocabularySchema>;

export type VocabularyTranslationInput =
  z.infer<typeof vocabularyTranslationSchema>;

export type VocabularyExampleInput =
  z.infer<typeof vocabularyExampleSchema>;

export type UpdateVocabularyExampleInput =
  z.infer<typeof updateVocabularyExampleSchema>;

export type VocabularyListQuery =
  z.infer<typeof vocabularyListQuerySchema>;
