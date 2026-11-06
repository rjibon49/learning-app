import { z } from 'zod';

// Match Prisma PublicationStatus enum
const PublicationStatusSchema = z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);

export const CreateCourseSchema = z.object({
  appId: z.string().min(1, 'App ID is required'),
  title: z.string().trim().min(1, 'Course title is required'),
  slug: z.string().trim().min(1, 'Course slug is required').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  status: PublicationStatusSchema.default('DRAFT'),
});

export const UpdateCourseSchema = CreateCourseSchema.partial();

export const CreateModuleSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  title: z.string().trim().min(1, 'Module title is required'),
  slug: z.string().trim().min(1, 'Module slug is required').regex(/^[a-z0-9-]+$/),
  description: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  status: PublicationStatusSchema.default('DRAFT'),
});

export const UpdateModuleSchema = CreateModuleSchema.partial();

export const CreateLessonSchema = z.object({
  moduleId: z.string().min(1, 'Module ID is required'),
  title: z.string().trim().min(1, 'Lesson title is required'),
  slug: z.string().trim().min(1, 'Lesson slug is required').regex(/^[a-z0-9-]+$/),
  germanText: z.string().trim().nullable().optional(),
  englishText: z.string().trim().nullable().optional(),
  banglaText: z.string().trim().nullable().optional(),
  estimatedMinutes: z.number().int().min(1).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  status: PublicationStatusSchema.default('DRAFT'),
});

export const UpdateLessonSchema = CreateLessonSchema.partial();

export type CreateCourseDto = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseDto = z.infer<typeof UpdateCourseSchema>;
export type CreateModuleDto = z.infer<typeof CreateModuleSchema>;
export type UpdateModuleDto = z.infer<typeof UpdateModuleSchema>;
export type CreateLessonDto = z.infer<typeof CreateLessonSchema>;
export type UpdateLessonDto = z.infer<typeof UpdateLessonSchema>;