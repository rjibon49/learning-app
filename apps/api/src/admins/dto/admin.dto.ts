import { z } from 'zod';

const AdminRoleEnum = z.enum(['SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR']);

export const CreateAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(2, 'Display name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: AdminRoleEnum.default('CONTENT_EDITOR'),
});

export const UpdateAdminSchema = z.object({
  displayName: z.string().min(2).optional(),
  role: AdminRoleEnum.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export type CreateAdminDto = z.infer<typeof CreateAdminSchema>;
export type UpdateAdminDto = z.infer<typeof UpdateAdminSchema>;