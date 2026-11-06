import { apiRequest } from './client';

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: {
    lessonProgress: number;
    vocabularyProgress: number;
    quizAttempts: number;
  };
}

export async function getUsers(): Promise<User[]> {
  return apiRequest<User[]>('/users');
}

export async function toggleUserStatus(id: string, isActive: boolean): Promise<User> {
  return apiRequest<User>(`/users/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}