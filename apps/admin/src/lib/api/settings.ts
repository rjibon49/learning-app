import { apiRequest } from './client';

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  isPublic: boolean;
  updatedAt: string;
}

export async function getSettings(): Promise<SystemSetting[]> {
  return apiRequest<SystemSetting[]>('/settings');
}

export async function updateSetting(key: string, value: string, description?: string): Promise<SystemSetting> {
  return apiRequest<SystemSetting>(`/settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value, description }),
  });
}

export async function deleteSetting(key: string): Promise<void> {
  return apiRequest<void>(`/settings/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
}