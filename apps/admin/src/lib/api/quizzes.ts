
import { apiRequest } from "@/lib/api/client";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type PublicationStatus =
  | "DRAFT"
  | "REVIEW"
  | "PUBLISHED"
  | "ARCHIVED";

export type QuizType =
  | "MULTIPLE_CHOICE"
  | "IMAGE_TO_TARGET"
  | "TEXT_TO_TARGET"
  | "AUDIO_TO_TARGET"
  | "TARGET_TO_TRANSLATION"
  | "TRANSLATION_TO_TARGET"
  | "MATCHING"
  | "FILL_BLANK"
  | "ARTICLE"
  | "LISTEN_AND_TYPE"
  | "SPEAKING"
  | "ORDERING"
  | "TRUE_FALSE";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface Quiz {
  id: string;
  appId: string | null;
  lessonId: string | null;
  title: string;
  description: string | null;
  difficulty: Difficulty;
  status: PublicationStatus;
  isPublished: boolean;
  timeLimitSeconds: number | null;
  passingScore: number | null;
  app?: { id: string; name: string } | null;
  lesson?: { id: string; title: string } | null;
  _count?: { questions: number; attempts: number };
}

export interface QuizOption {
  id?: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  vocabularyId: string | null;
  questionType: QuizType;
  questionText: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  points: number;
  sortOrder: number;
  options: QuizOption[];
}

export interface QuizInput {
  appId?: string | null;
  lessonId?: string | null;
  title: string;
  description?: string | null;
  difficulty?: Difficulty;
  status?: PublicationStatus;
  timeLimitSeconds?: number | null;
  passingScore?: number | null;
}

export interface QuestionInput {
  quizId: string;
  vocabularyId?: string | null;
  questionType: QuizType;
  questionText?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  correctAnswer?: string | null;
  explanation?: string | null;
  points?: number;
  sortOrder?: number;
  options?: QuizOption[];
}

export interface QuizQuery {
  appId?: string;
  status?: PublicationStatus;
  difficulty?: Difficulty;
  search?: string;
  page?: number;
  limit?: number;
}

function query(values: QuizQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

function id(value: string): string {
  return encodeURIComponent(value);
}

export function getQuizzesPage(
  filters: QuizQuery = {},
): Promise<Paginated<Quiz>> {
  return apiRequest<Paginated<Quiz>>(
    `/admin/quizzes?${query({
      page: 1,
      limit: 10,
      ...filters,
    })}`,
  );
}

export async function getQuizzes(
  appId?: string,
): Promise<Quiz[]> {
  const result = await getQuizzesPage({
    appId,
    page: 1,
    limit: 100,
  });
  return result.data;
}

export function getQuiz(quizId: string): Promise<Quiz> {
  return apiRequest<Quiz>(
    `/admin/quizzes/${id(quizId)}`,
  );
}

export function createQuiz(input: QuizInput): Promise<Quiz> {
  return apiRequest<Quiz>("/admin/quizzes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateQuiz(
  quizId: string,
  input: Partial<QuizInput>,
): Promise<Quiz> {
  return apiRequest<Quiz>(
    `/admin/quizzes/${id(quizId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function deleteQuiz(quizId: string): Promise<Quiz> {
  return apiRequest<Quiz>(
    `/admin/quizzes/${id(quizId)}`,
    { method: "DELETE" },
  );
}

export function getQuizQuestions(
  quizId: string,
): Promise<QuizQuestion[]> {
  return apiRequest<QuizQuestion[]>(
    `/admin/quizzes/${id(quizId)}/questions`,
  );
}

export function createQuestion(
  input: QuestionInput,
): Promise<QuizQuestion> {
  return apiRequest<QuizQuestion>(
    "/admin/quizzes/questions",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function updateQuestion(
  questionId: string,
  input: Partial<Omit<QuestionInput, "quizId">>,
): Promise<QuizQuestion> {
  return apiRequest<QuizQuestion>(
    `/admin/quizzes/questions/${id(questionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function deleteQuestion(
  questionId: string,
): Promise<unknown> {
  return apiRequest(
    `/admin/quizzes/questions/${id(questionId)}`,
    { method: "DELETE" },
  );
}
