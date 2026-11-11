
import { z } from 'zod';

export const auditListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),

  adminId: z.cuid().optional(),
  action: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(100).optional(),
  entityId: z.string().trim().max(191).optional(),

  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
}).strict().refine(
  (value) =>
    !value.from ||
    !value.to ||
    new Date(value.from) <= new Date(value.to),
  {
    path: ['to'],
    message: 'to must be after from',
  },
);

export type AuditListInput = z.infer<typeof auditListSchema>;
