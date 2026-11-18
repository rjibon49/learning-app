import { apiRequest } from './client';
import { withPermanent } from "@/lib/api/delete";

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

export interface CreateAdminInput {
  email: string;
  displayName: string;
  password: string;
  role: AdminRole;
}

export interface UpdateAdminInput {
  displayName?: string;
  role?: AdminRole;
  isActive?: boolean;
  password?: string;
}

type AdminPage = {
  data: AdminUser[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

/** GET /admins is paginated; admin teams are small, so load the first 100. */
export async function getAdmins(): Promise<AdminUser[]> {
  const result = await apiRequest<AdminPage | AdminUser[]>('/admins?page=1&limit=100');
  return Array.isArray(result) ? result : result.data;
}

export async function createAdmin(payload: CreateAdminInput): Promise<AdminUser> {
  return apiRequest<AdminUser>('/admins', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAdmin(id: string, payload: UpdateAdminInput): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/admins/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteAdmin(id: string, permanent = false): Promise<void> {
  return apiRequest<void>(withPermanent(`/admins/${encodeURIComponent(id)}`, permanent), { method: 'DELETE' });
}
