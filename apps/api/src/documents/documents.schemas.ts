
import { z } from 'zod';

export const documentIdSchema = z.cuid();

export const uploadDocumentSchema = z.object({
  appId: documentIdSchema.optional(),

  visibility: z
    .enum(['PUBLIC', 'PRIVATE'])
    .default('PRIVATE'),
}).strict();

export const documentJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100)
    .default(20),

  status: z.enum([
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
  ]).optional(),
}).strict();

export type UploadDocumentInput =
  z.infer<typeof uploadDocumentSchema>;

export type DocumentJobsQuery =
  z.infer<typeof documentJobsQuerySchema>;
