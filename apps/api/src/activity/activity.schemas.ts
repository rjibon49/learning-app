
import { z } from 'zod';

export const activityUserIdSchema = z.cuid();

export const activityListSchema = z.object({
  userId: activityUserIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
}).strict().refine(
  (data) =>
    !data.from || !data.to || data.from <= data.to,
  {
    path: ['to'],
    message: 'to must be after from',
  },
);

export type ActivityListInput =
  z.infer<typeof activityListSchema>;
