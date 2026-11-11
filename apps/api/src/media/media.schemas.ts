
import { z } from 'zod';

export const mediaIdSchema = z.cuid();

export const mediaVisibilitySchema =
  z.enum(['PUBLIC', 'PRIVATE']);

export const mediaUploadSchema = z.object({
  appId: mediaIdSchema.optional(),
  visibility: mediaVisibilitySchema.default('PRIVATE'),
}).strict();

export const mediaListSchema = z.object({
  appId: mediaIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export type MediaUploadInput =
  z.infer<typeof mediaUploadSchema>;

export type MediaListInput =
  z.infer<typeof mediaListSchema>;
