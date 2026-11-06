import { apiRequest, refreshAccessToken, setAccessToken } from './client';
import type {
  AdminUser,
  LoginRequestDto,
  LoginResponseDto,
} from '@/types/auth';

export interface HealthStatusResponse {
  status: string;
  service: string;
  database: string;
  timestamp: string;
}

export async function getApiHealth(): Promise<HealthStatusResponse> {
  return apiRequest<HealthStatusResponse>('/health', {
    method: 'GET',
    skipAuthRefresh: true,
  });
}

export async function loginAdmin(
  payload: LoginRequestDto
): Promise<LoginResponseDto> {
  const response = await apiRequest<LoginResponseDto>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  });
  setAccessToken(response.accessToken);
  return response;
}

export async function getCurrentAdmin(): Promise<AdminUser> {
  const response = await apiRequest<AdminUser | { admin: AdminUser }>(
    '/admin/auth/me',
    {
      method: 'GET',
    }
  );
  if ('admin' in response && response.admin) {
    return response.admin;
  }
  return response as AdminUser;
}

export async function tryRestoreAdminSession(): Promise<AdminUser | null> {
  const token = await refreshAccessToken();
  if (!token) {
    return null;
  }
  try {
    return await getCurrentAdmin();
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await apiRequest<void>('/admin/auth/logout', {
      method: 'POST',
      skipAuthRefresh: true,
    });
  } finally {
    setAccessToken(null);
  }
}

export async function logoutAllAdminSessions(): Promise<void> {
  try {
    await apiRequest<void>('/admin/auth/logout-all', {
      method: 'POST',
    });
  } finally {
    setAccessToken(null);
  }
}