import { apiRequest } from './client';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'CONTENT_EDITOR';

export interface AdminUser {
  id: string;
  email: string;
  displayName?: string | null;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export async function getAdmins(): Promise<AdminUser[]> {
  return apiRequest<AdminUser[]>('/admins');
}

export async function createAdmin(payload: any): Promise<AdminUser> {
  return apiRequest<AdminUser>('/admins', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAdmin(id: string, payload: any): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/admins/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteAdmin(id: string): Promise<void> {
  return apiRequest<void>(`/admins/${encodeURIComponent(id)}`, { method: 'DELETE' });
}