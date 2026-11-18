import { apiRequest } from './client';

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  isActive: boolean;
  
  referralCode?: string | null;
  referredById?: string | null;
  adFreeUntil?: string | null;
  currentStreak?: number;
  longestStreak?: number;
  lastActivityDate?: string | null;

  lastLoginAt: string | null;
  createdAt: string;
  
  _count?: {
    lessonProgress: number;
    vocabularyProgress: number;
    quizAttempts: number;
  };
}

const PAGE_SIZE = 100;

/** Server-side search: the API returns at most 100 rows per call. */
export async function getUsers(params: { search?: string; skip?: number } = {}): Promise<User[]> {
  const query = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(params.skip ?? 0) });
  const search = params.search?.trim();
  if (search) query.set('search', search.slice(0, 100));
  return apiRequest<User[]>(`/users?${query.toString()}`);
}

export const USERS_PAGE_SIZE = PAGE_SIZE;

export async function toggleUserStatus(id: string, isActive: boolean): Promise<User> {
  return apiRequest<User>(`/users/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}