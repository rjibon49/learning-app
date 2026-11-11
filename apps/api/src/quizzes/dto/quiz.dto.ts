
import { z } from 'zod';

export const quizIdSchema = z.cuid();

const nullableId = quizIdSchema.nullable().optional();

const publication = z.enum([
  'DRAFT',
  'REVIEW',
  'PUBLISHED',
  'ARCHIVED',
]);

const difficulty = z.enum([
  'EASY',
  'MEDIUM',
  'HARD',
]);

const questionType = z.enum([
  'MULTIPLE_CHOICE',
  'IMAGE_TO_TARGET',
  'TEXT_TO_TARGET',
  'AUDIO_TO_TARGET',
  'TARGET_TO_TRANSLATION',
  'TRANSLATION_TO_TARGET',
  'MATCHING',
  'FILL_BLANK',
  'ARTICLE',
  'LISTEN_AND_TYPE',
  'SPEAKING',
  'ORDERING',
  'TRUE_FALSE',
]);

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const nullableUrl = z
  .url()
  .max(2048)
  .refine(
    (value) => value.startsWith('https://'),
    'Media URL must use HTTPS',
  )
  .nullable()
  .optional();

const quizFields = z.object({
  appId: nullableId,
  lessonId: nullableId,

  title: z.string().trim().min(2).max(200),
  description: nullableText(10000),

  difficulty: difficulty.default('EASY'),

  status: publication.default('DRAFT'),

  timeLimitSeconds: z
    .number()
    .int()
    .min(10)
    .max(86400)
    .nullable()
    .optional(),

  passingScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .nullable()
    .optional(),
});

export const CreateQuizSchema =
  quizFields.strict();

export const UpdateQuizSchema =
  quizFields.partial().strict();

const optionSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  isCorrect: z.boolean(),
  sortOrder: z.number().int().min(0).max(100000),
}).strict();

const questionFields = z.object({
  quizId: quizIdSchema,

  vocabularyId: nullableId,

  questionType: questionType.default(
    'MULTIPLE_CHOICE',
  ),

  questionText: nullableText(10000),
  imageUrl: nullableUrl,
  audioUrl: nullableUrl,

  correctAnswer: nullableText(10000),

  explanation: nullableText(10000),

  options: z.array(optionSchema).max(30).optional(),

  points: z.number().int().min(1).max(1000).default(1),

  sortOrder: z
    .number()
    .int()
    .min(0)
    .max(100000)
    .default(0),
});

export const CreateQuestionSchema =
  questionFields.strict();

export const UpdateQuestionSchema =
  questionFields
    .omit({ quizId: true })
    .partial()
    .strict();

export const QuizListQuerySchema = z
  .object({
    appId: quizIdSchema.optional(),
    lessonId: quizIdSchema.optional(),

    status: publication.optional(),

    difficulty: difficulty.optional(),

    search: z.string().trim().max(100).optional(),

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

export type CreateQuizDto =
  z.infer<typeof CreateQuizSchema>;

export type UpdateQuizDto =
  z.infer<typeof UpdateQuizSchema>;

export type CreateQuestionDto =
  z.infer<typeof CreateQuestionSchema>;

export type UpdateQuestionDto =
  z.infer<typeof UpdateQuestionSchema>;

export type QuizListQueryDto =
  z.infer<typeof QuizListQuerySchema>;
