
import { z } from 'zod';

export const flashcardIdSchema = z.cuid();

const difficultySchema = z.enum([
  'EASY',
  'MEDIUM',
  'HARD',
]);

const sortOrderSchema = z
  .number()
  .int()
  .min(0)
  .max(1000000);

export const CreateDeckSchema = z
  .object({
    appId: flashcardIdSchema,

    title: z
      .string()
      .trim()
      .min(2)
      .max(200),

    description: z
      .string()
      .trim()
      .max(10000)
      .nullable()
      .optional(),

    difficulty: difficultySchema.default('EASY'),

    isPublished: z.boolean().default(false),

    sortOrder: sortOrderSchema.default(0),
  })
  .strict();

export const UpdateDeckSchema = CreateDeckSchema
  .omit({ appId: true })
  .partial()
  .strict();

export const AddDeckItemsSchema = z
  .object({
    vocabularyIds: z
      .array(flashcardIdSchema)
      .min(1)
      .max(200)
      .refine(
        (items) => new Set(items).size === items.length,
        'Duplicate vocabulary IDs are not allowed',
      ),
  })
  .strict();

export const DeckListQuerySchema = z
  .object({
    appId: flashcardIdSchema.optional(),

    language: z
      .string()
      .trim()
      .toLowerCase()
      .max(16)
      .optional(),

    difficulty: difficultySchema.optional(),

    search: z
      .string()
      .trim()
      .max(100)
      .optional(),

    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),
  })
  .strict();

export const PaginationSchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(50),
  })
  .strict();

export type CreateDeckDto =
  z.infer<typeof CreateDeckSchema>;

export type UpdateDeckDto =
  z.infer<typeof UpdateDeckSchema>;

export type AddDeckItemsDto =
  z.infer<typeof AddDeckItemsSchema>;

export type DeckListQueryDto =
  z.infer<typeof DeckListQuerySchema>;

export type PaginationDto =
  z.infer<typeof PaginationSchema>;
