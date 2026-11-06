import { z } from 'zod';

const PublicationStatusEnum = z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);
const QuizTypeEnum = z.enum([
  'IMAGE_TO_GERMAN', 'ENGLISH_TO_GERMAN', 'BANGLA_TO_GERMAN', 
  'AUDIO_TO_GERMAN', 'GERMAN_TO_ENGLISH', 'GERMAN_TO_BANGLA', 
  'ARTICLE', 'MULTIPLE_CHOICE', 'MATCHING', 'FILL_BLANK'
]);
const DifficultyEnum = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const CreateQuizSchema = z.object({
  appId: z.string().min(1, 'App ID is required'),
  lessonId: z.string().nullable().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  type: QuizTypeEnum,
  difficulty: DifficultyEnum.default('EASY'),
  status: PublicationStatusEnum.default('DRAFT'),
  isPublished: z.boolean().default(false),
  timeLimitSeconds: z.number().int().nullable().optional(),
  passingScore: z.number().int().nullable().optional(),
});

export const UpdateQuizSchema = CreateQuizSchema.partial();

export const CreateQuestionSchema = z.object({
  quizId: z.string().min(1, 'Quiz ID is required'),
  vocabularyId: z.string().nullable().optional(),
  questionType: QuizTypeEnum.default('MULTIPLE_CHOICE'),
  questionText: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  optionsJson: z.any().optional(), // Multiple choice এর অপশনগুলোর জন্য
  explanation: z.string().nullable().optional(),
  points: z.number().int().default(1),
  sortOrder: z.number().int().default(0),
});

export const UpdateQuestionSchema = CreateQuestionSchema.partial();

export type CreateQuizDto = z.infer<typeof CreateQuizSchema>;
export type UpdateQuizDto = z.infer<typeof UpdateQuizSchema>;
export type CreateQuestionDto = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionDto = z.infer<typeof UpdateQuestionSchema>;