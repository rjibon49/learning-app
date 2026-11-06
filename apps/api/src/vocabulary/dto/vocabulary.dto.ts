// apps/api/src/vocabulary/dto/vocabulary.dto.ts
import { z } from 'zod';

export const CreateVocabularySchema = z.object({
  appId: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  lessonId: z.string().nullable().optional(),
  article: z.string().nullable().optional(),
  german: z.string().min(1),
  english: z.string().min(1),
  bangla: z.string().min(1),
  pronunciationBangla: z.string().nullable().optional(),
  pluralGerman: z.string().nullable().optional(),
  exampleGerman: z.string().nullable().optional(),
  exampleEnglish: z.string().nullable().optional(),
  exampleBangla: z.string().nullable().optional(),
  
  // Media Fields (These need to be allowed)
  imageUrl: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  imageAssetId: z.string().nullable().optional(),
  audioAssetId: z.string().nullable().optional(),

  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('EASY'),
  isPublished: z.boolean().default(false),
  notes: z.string().nullable().optional(),
});

export const UpdateVocabularySchema = CreateVocabularySchema.partial();