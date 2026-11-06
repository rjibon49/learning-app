import { z } from 'zod';

const DifficultyEnum = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const CreateDeckSchema = z.object({
  appId: z.string().min(1, 'App ID is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  difficulty: DifficultyEnum.default('EASY'),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const UpdateDeckSchema = CreateDeckSchema.partial();

export const AddDeckItemsSchema = z.object({
  vocabularyIds: z.array(z.string()).min(1, 'Select at least one vocabulary'),
});

export type CreateDeckDto = z.infer<typeof CreateDeckSchema>;
export type UpdateDeckDto = z.infer<typeof UpdateDeckSchema>;