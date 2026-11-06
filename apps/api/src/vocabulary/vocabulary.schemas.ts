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

export const updateCategorySchema = createCategorySchema.partial();

export const createVocabularySchema = z.object({
  appId: z.string().min(1),

  lessonId: z.string().min(1).optional().nullable(),
  categoryId: z.string().min(1).optional().nullable(),

  article: z.enum(['der', 'die', 'das']).optional().nullable(),

  german: z.string().trim().min(1).max(255),
  english: z.string().trim().min(1).max(255),
  bangla: z.string().trim().min(1).max(255),

  pronunciationBangla: z.string().trim().max(255).optional().nullable(),
  pluralGerman: z.string().trim().max(255).optional().nullable(),

  exampleGerman: z.string().trim().max(2000).optional().nullable(),
  exampleEnglish: z.string().trim().max(2000).optional().nullable(),
  exampleBangla: z.string().trim().max(2000).optional().nullable(),

  imageUrl: z.string().url().optional().nullable(),
  audioUrl: z.string().url().optional().nullable(),
  
  // Media Asset Linking
  imageAssetId: z.string().optional().nullable(),
  audioAssetId: z.string().optional().nullable(),

  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('EASY'),
  isPublished: z.boolean().default(false),
});

export const updateVocabularySchema = createVocabularySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateVocabularyInput = z.infer<typeof createVocabularySchema>;
export type UpdateVocabularyInput = z.infer<typeof updateVocabularySchema>;