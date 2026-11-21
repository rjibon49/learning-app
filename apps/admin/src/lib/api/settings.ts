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
export interface LegalDefaults {
  privacy: string;
  terms: string;
  placeholders: string[];
}

/** Built-in privacy / terms Markdown, to start editing from. */
export async function getLegalDefaults(): Promise<LegalDefaults> {
  return apiRequest<LegalDefaults>('/settings/legal-defaults');
}
