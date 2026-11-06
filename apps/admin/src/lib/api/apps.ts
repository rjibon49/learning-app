import { apiRequest } from './client';
import type { LearningApp } from '@/types/app';

export async function getApps(): Promise<LearningApp[]> {
  return apiRequest<LearningApp[]>('/apps', {
    method: 'GET',
  });
}

export async function getAppBySlug(slug: string): Promise<LearningApp> {
  return apiRequest<LearningApp>(`/apps/${encodeURIComponent(slug)}`, {
    method: 'GET',
  });
}