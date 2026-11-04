import { z } from 'zod';

export const createCategorySchema = z.object({
  appId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),

  germanName: z.string().trim().max(120).optional(),
  banglaName: z.string().trim().max(120).optional(),

  sortOrder: z.number().int().min(0).default(0),
});

export const createVocabularySchema = z.object({
  appId: z.string().min(1),

  lessonId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),

  article: z.enum(['der', 'die', 'das']).optional(),

  german: z.string().trim().min(1).max(255),
  english: z.string().trim().min(1).max(255),
  bangla: z.string().trim().min(1).max(255),

  pronunciationBangla: z.string().trim().max(255).optional(),

  pluralGerman: z.string().trim().max(255).optional(),

  exampleGerman: z.string().trim().max(2000).optional(),
  exampleEnglish: z.string().trim().max(2000).optional(),
  exampleBangla: z.string().trim().max(2000).optional(),

  imageUrl: z.string().url().optional(),
  audioUrl: z.string().url().optional(),

  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('EASY'),

  isPublished: z.boolean().default(false),
});

export const updateVocabularySchema =
  createVocabularySchema.partial();

export type CreateCategoryInput =
  z.infer<typeof createCategorySchema>;

export type CreateVocabularyInput =
  z.infer<typeof createVocabularySchema>;

export type UpdateVocabularyInput =
  z.infer<typeof updateVocabularySchema>;