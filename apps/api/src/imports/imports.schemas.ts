
import { z } from 'zod';

export const importIdSchema = z.cuid();

const difficultySchema = z.enum([
  'EASY',
  'MEDIUM',
  'HARD',
]);

const grammarSchema = z
  .record(
    z.string().min(1).max(80),
    z.union([
      z.string().max(2000),
      z.number().finite(),
      z.boolean(),
      z.null(),
      z.array(z.string().max(500)).max(30),
    ]),
  )
  .nullable()
  .optional();

const translationSchema = z.object({
  languageCode: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(16),

  meaning: z.string().trim().min(1).max(10000),

  notes: z.string().trim().max(10000)
    .nullable().optional(),
}).strict();

const exampleSchema = z.object({
  languageCode: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(16),

  text: z.string().trim().min(1).max(10000),

  translationGroupId: z.string()
    .trim().min(1).max(100)
    .nullable().optional(),
}).strict();

export const importVocabularyItemSchema = z.object({
  term: z.string().trim().min(1).max(500),

  pronunciation: z.string().trim().max(500)
    .nullable().optional(),

  partOfSpeech: z.string().trim().max(80)
    .nullable().optional(),

  grammar: grammarSchema,

  difficulty: difficultySchema.default('EASY'),

  categoryId: importIdSchema.nullable().optional(),

  lessonId: importIdSchema.nullable().optional(),

  notes: z.string().trim().max(10000)
    .nullable().optional(),

  translations: z.array(translationSchema)
    .min(1).max(20),

  examples: z.array(exampleSchema)
    .max(30).default([]),
}).strict();

export const createVocabularyImportSchema = z.object({
  appId: importIdSchema,

  filename: z.string().trim()
    .min(1).max(255)
    .default('admin-json-import'),

  // Imports are initially DRAFT for review.
  items: z.array(importVocabularyItemSchema)
    .min(1).max(100),
}).strict();

export const importJobsQuerySchema = z.object({
  appId: importIdSchema.optional(),

  status: z.enum([
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'PARTIAL',
  ]).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int()
    .min(1).max(100).default(20),
}).strict();

export type CreateVocabularyImportInput =
  z.infer<typeof createVocabularyImportSchema>;

export type ImportVocabularyItem =
  z.infer<typeof importVocabularyItemSchema>;

export type ImportJobsQuery =
  z.infer<typeof importJobsQuerySchema>;
