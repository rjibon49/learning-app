import { apiClient } from "./client";

type Page<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type QuizSummary = {
  id: string;
  title: string;
  description: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  lessonId: string | null;
  _count?: { questions?: number };
};

export type QuizOption = { id: string; text: string; sortOrder: number };

export type QuizQuestion = {
  id: string;
  questionType: string;
  questionText: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  points: number;
  options: QuizOption[];
};

export type QuizDetail = {
  id: string;
  title: string;
  description: string | null;
  passingScore: number | null;
  timeLimitSeconds: number | null;
  questions: QuizQuestion[];
};

export type QuizResult = {
  attemptId: string;
  quizId: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
};

/**
 * How the API grades each question type (apps/api progress.service submitQuiz):
 *  - MULTIPLE_CHOICE / TRUE_FALSE: the selected option id
 *  - these text types: the answer text compared with the answer key
 *  - anything else (MATCHING, SPEAKING, ORDERING): not gradable yet
 */
const ID_TYPES = new Set(["MULTIPLE_CHOICE", "TRUE_FALSE"]);
const TEXT_TYPES = new Set([
  "IMAGE_TO_TARGET",
  "TEXT_TO_TARGET",
  "AUDIO_TO_TARGET",
  "TARGET_TO_TRANSLATION",
  "TRANSLATION_TO_TARGET",
  "FILL_BLANK",
  "ARTICLE",
  "LISTEN_AND_TYPE",
]);

export type AnswerMode = "option-id" | "option-text" | "typed" | "unsupported";

export function answerMode(q: QuizQuestion): AnswerMode {
  if (ID_TYPES.has(q.questionType)) return q.options.length > 0 ? "option-id" : "unsupported";
  if (TEXT_TYPES.has(q.questionType)) return q.options.length > 0 ? "option-text" : "typed";
  return "unsupported";
}

export async function fetchQuizzes(appId: string, lessonId?: string): Promise<QuizSummary[]> {
  const res = await apiClient.get<Page<QuizSummary>>("/quizzes", {
    params: { appId, ...(lessonId ? { lessonId } : {}), limit: 50 },
  });
  return res.data.data;
}

export async function fetchQuiz(quizId: string): Promise<QuizDetail> {
  const res = await apiClient.get<QuizDetail>(`/quizzes/${encodeURIComponent(quizId)}`);
  return res.data;
}

export async function submitQuiz(
  quizId: string,
  answers: { questionId: string; answer: string }[],
): Promise<QuizResult> {
  const res = await apiClient.post<QuizResult>("/learner/progress/quizzes/submit", { quizId, answers });
  return res.data;
}
