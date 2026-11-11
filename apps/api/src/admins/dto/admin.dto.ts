
import { z } from 'zod';

export const adminIdSchema = z.cuid();

export const adminRoleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_EDITOR',
]);

export const CreateAdminSchema = z.object({
  email: z.email()
    .trim()
    .toLowerCase()
    .max(191),

  displayName: z.string()
    .trim()
    .min(2)
    .max(120),

  password: z.string()
    .min(12)
    .max(128),

  role: adminRoleSchema.default('CONTENT_EDITOR'),
}).strict();

export const UpdateAdminSchema = z.object({
  displayName: z.string()
    .trim()
    .min(2)
    .max(120)
    .optional(),

  role: adminRoleSchema.optional(),

  isActive: z.boolean().optional(),

  password: z.string()
    .min(12)
    .max(128)
    .optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  'At least one field is required',
);

export const adminListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: adminRoleSchema.optional(),
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().trim().max(100).optional(),
}).strict();

export type CreateAdminDto = z.infer<typeof CreateAdminSchema>;
export type UpdateAdminDto = z.infer<typeof UpdateAdminSchema>;
export type AdminListDto = z.infer<typeof adminListSchema>;
