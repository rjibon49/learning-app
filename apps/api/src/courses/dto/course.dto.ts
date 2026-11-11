
import { z } from 'zod';

export const idSchema = z.cuid();

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const publicationSchema = z.enum([
  'DRAFT',
  'REVIEW',
  'PUBLISHED',
  'ARCHIVED',
]);

const descriptionSchema = z
  .string()
  .trim()
  .max(10000)
  .nullable()
  .optional();

const orderSchema = z
  .number()
  .int()
  .min(0)
  .max(1000000);

// ========================================
// COURSES
// ========================================

export const CreateCourseSchema = z
  .object({
    languageId: idSchema,
    levelId: idSchema.nullable().optional(),

    title: z.string().trim().min(2).max(200),
    slug: slugSchema,
    description: descriptionSchema,

    sortOrder: orderSchema.default(0),
    status: publicationSchema.default('DRAFT'),
  })
  .strict();

export const UpdateCourseSchema =
  CreateCourseSchema.omit({
    languageId: true,
  })
    .partial()
    .strict();

// ========================================
// COURSE APP ASSIGNMENT
// ========================================

export const AssignCourseAppsSchema = z
  .object({
    appIds: z
      .array(idSchema)
      .max(100)
      .refine(
        (items) =>
          new Set(items).size === items.length,
        'Duplicate app IDs are not allowed',
      ),
  })
  .strict();

// ========================================
// MODULES
// ========================================

export const CreateModuleSchema = z
  .object({
    courseId: idSchema,

    title: z.string().trim().min(2).max(200),
    slug: slugSchema,
    description: descriptionSchema,

    sortOrder: orderSchema.default(0),
    status: publicationSchema.default('DRAFT'),
  })
  .strict();

export const UpdateModuleSchema =
  CreateModuleSchema.omit({
    courseId: true,
  })
    .partial()
    .strict();

// ========================================
// LESSONS
// ========================================

export const CreateLessonSchema = z
  .object({
    moduleId: idSchema,

    title: z.string().trim().min(2).max(200),
    slug: slugSchema,

    estimatedMinutes: z
      .number()
      .int()
      .min(1)
      .max(1440)
      .nullable()
      .optional(),

    sortOrder: orderSchema.default(0),
    status: publicationSchema.default('DRAFT'),
  })
  .strict();

export const UpdateLessonSchema =
  CreateLessonSchema.omit({
    moduleId: true,
  })
    .partial()
    .strict();

// ========================================
// LESSON TRANSLATIONS
// ========================================

export const UpsertLessonTranslationSchema = z
  .object({
    languageId: idSchema,

    title: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .nullable()
      .optional(),

    content: z
      .string()
      .min(1)
      .max(500000),

    format: z
      .enum(['TEXT', 'MARKDOWN', 'HTML', 'JSON'])
      .default('MARKDOWN'),
  })
  .strict();

// ========================================
// LESSON RESOURCES
// ========================================

export const CreateLessonResourceSchema = z
  .object({
    assetId: idSchema,

    type: z.enum([
      'PDF',
      'AUDIO',
      'IMAGE',
      'VIDEO',
      'DOCUMENT',
    ]),

    title: z.string().trim().min(1).max(200),

    sortOrder: orderSchema.default(0),
  })
  .strict();

export const UpdateLessonResourceSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    sortOrder: orderSchema.optional(),
  })
  .strict();

// ========================================
// LIST FILTERS
// ========================================

export const courseQuerySchema = z
  .object({
    appId: idSchema.optional(),
    language: z.string().trim().toLowerCase().optional(),
    level: z.string().trim().toUpperCase().optional(),
    status: publicationSchema.optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const moduleQuerySchema = z
  .object({
    courseId: idSchema,
  })
  .strict();

export const lessonQuerySchema = z
  .object({
    moduleId: idSchema,
  })
  .strict();

// ========================================
// TYPES
// ========================================

export type CreateCourseDto =
  z.infer<typeof CreateCourseSchema>;

export type UpdateCourseDto =
  z.infer<typeof UpdateCourseSchema>;

export type AssignCourseAppsDto =
  z.infer<typeof AssignCourseAppsSchema>;

export type CreateModuleDto =
  z.infer<typeof CreateModuleSchema>;

export type UpdateModuleDto =
  z.infer<typeof UpdateModuleSchema>;

export type CreateLessonDto =
  z.infer<typeof CreateLessonSchema>;

export type UpdateLessonDto =
  z.infer<typeof UpdateLessonSchema>;

export type UpsertLessonTranslationDto =
  z.infer<typeof UpsertLessonTranslationSchema>;

export type CreateLessonResourceDto =
  z.infer<typeof CreateLessonResourceSchema>;

export type UpdateLessonResourceDto =
  z.infer<typeof UpdateLessonResourceSchema>;

export type CourseQueryDto =
  z.infer<typeof courseQuerySchema>;
