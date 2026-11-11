
import { z } from 'zod';

export const progressIdSchema = z.cuid();

export const reviewVocabularySchema = z
  .object({
    vocabularyId: progressIdSchema,

    // SM-2 recall quality: 0 to 5
    quality: z.number().int().min(0).max(5),
  })
  .strict();

export const updateLessonProgressSchema = z
  .object({
    lessonId: progressIdSchema,

    completion: z.number().int().min(0).max(100),

    lastPosition: z
      .number()
      .int()
      .min(0)
      .max(10000000)
      .nullable()
      .optional(),
  })
  .strict();

export const submitQuizSchema = z
  .object({
    quizId: progressIdSchema,

    answers: z
      .array(
        z.object({
          questionId: progressIdSchema,

          // MCQ/True-False: selected option ID.
          // Text questions: learner's written answer.
          answer: z.string().trim().min(1).max(10000),
        }).strict(),
      )
      .min(1)
      .max(100)
      .refine(
        (answers) =>
          new Set(
            answers.map((item) => item.questionId),
          ).size === answers.length,
        'Duplicate question answers are not allowed',
      ),
  })
  .strict();

export const progressPaginationSchema = z
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
      .default(20),

    language: z
      .string()
      .trim()
      .toLowerCase()
      .max(16)
      .optional(),
  })
  .strict();

export type ReviewVocabularyDto =
  z.infer<typeof reviewVocabularySchema>;

export type UpdateLessonProgressDto =
  z.infer<typeof updateLessonProgressSchema>;

export type SubmitQuizDto =
  z.infer<typeof submitQuizSchema>;

export type ProgressPaginationDto =
  z.infer<typeof progressPaginationSchema>;