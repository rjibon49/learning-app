import { apiClient } from "./client";

export type Dashboard = {
  user: { id: string; displayName: string };
  vocabulary: { learned: number; due: number; mastered: number };
  lessons: { completed: number };
  quizzes: { attempts: number };
  streak: { current: number; longest: number; timezone: string };
};

export type ActivityDay = {
  date: string; // ISO, UTC midnight
  isStreakCounted: boolean;
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  score: number;
  total: number;
  percentage: number | string;
  completedAt: string | null;
  quiz: { title: string; passingScore: number | null };
};

export async function fetchDashboard(): Promise<Dashboard> {
  const res = await apiClient.get<Dashboard>("/learner/progress/dashboard");
  return res.data;
}

/** UTC date key "YYYY-MM-DD" (the API counts streak days in UTC). */
export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Days with activity in the last `days` days (keys "YYYY-MM-DD"). */
export async function fetchActiveDays(days = 7): Promise<Set<string>> {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86400000);
  const res = await apiClient.get<{ data: ActivityDay[] }>("/activity/me", {
    params: { from: utcDayKey(from), to: utcDayKey(to), limit: 100 },
  });
  return new Set(res.data.data.map((d) => d.date.slice(0, 10)));
}

export async function fetchQuizHistory(limit = 20): Promise<QuizAttempt[]> {
  const res = await apiClient.get<{ data: QuizAttempt[] }>("/learner/progress/quizzes/history", {
    params: { page: 1, limit },
  });
  return res.data.data;
}

export async function saveLessonProgress(lessonId: string, completion: number): Promise<void> {
  await apiClient.post("/learner/progress/lessons", {
    lessonId,
    completion: Math.max(0, Math.min(100, Math.round(completion))),
  });
}
