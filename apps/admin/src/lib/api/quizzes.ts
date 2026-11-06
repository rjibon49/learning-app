import { apiRequest } from './client';

export type QuizType = 'IMAGE_TO_GERMAN' | 'ENGLISH_TO_GERMAN' | 'BANGLA_TO_GERMAN' | 'AUDIO_TO_GERMAN' | 'GERMAN_TO_ENGLISH' | 'GERMAN_TO_BANGLA' | 'ARTICLE' | 'MULTIPLE_CHOICE' | 'MATCHING' | 'FILL_BLANK';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type PublicationStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface Quiz {
  id: string;
  appId: string;
  lessonId?: string | null;
  title: string;
  description?: string | null;
  type: QuizType;
  difficulty: Difficulty;
  status: PublicationStatus;
  isPublished: boolean;
  timeLimitSeconds?: number | null;
  passingScore?: number | null;
  lesson?: { title: string };
  _count?: { questions: number };
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  vocabularyId?: string | null;
  questionType: QuizType;
  questionText?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  correctAnswer: string;
  optionsJson?: any;
  explanation?: string | null;
  points: number;
  sortOrder: number;
}

// ================= QUIZ API =================
export async function getQuizzes(appId?: string): Promise<Quiz[]> {
  const query = appId ? `?appId=${encodeURIComponent(appId)}` : '';
  return apiRequest<Quiz[]>(`/quizzes${query}`);
}

export async function createQuiz(payload: Partial<Quiz>): Promise<Quiz> {
  return apiRequest<Quiz>('/quizzes', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateQuiz(id: string, payload: Partial<Quiz>): Promise<Quiz> {
  return apiRequest<Quiz>(`/quizzes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteQuiz(id: string): Promise<void> {
  return apiRequest<void>(`/quizzes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ================= QUESTION API =================
export async function getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
  return apiRequest<QuizQuestion[]>(`/quizzes/${encodeURIComponent(quizId)}/questions`);
}

export async function createQuestion(payload: Partial<QuizQuestion>): Promise<QuizQuestion> {
  return apiRequest<QuizQuestion>('/quizzes/questions', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateQuestion(id: string, payload: Partial<QuizQuestion>): Promise<QuizQuestion> {
  return apiRequest<QuizQuestion>(`/quizzes/questions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteQuestion(id: string): Promise<void> {
  return apiRequest<void>(`/quizzes/questions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}