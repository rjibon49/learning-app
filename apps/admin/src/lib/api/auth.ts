
import {
  apiRequest,
  refreshAccessToken,
  setAccessToken,
} from "./client";

import type {
  AdminUser,
  LoginRequestDto,
  LoginResponseDto,
} from "@/types/auth";

export interface HealthStatusResponse {
  status: string;
  service: string;
  database: string;
  timestamp: string;
}

export function getApiHealth(): Promise<HealthStatusResponse> {
  return apiRequest("/health", {
    method: "GET",
    skipAuthRefresh: true,
  });
}

export async function loginAdmin(
  credentials: LoginRequestDto,
): Promise<LoginResponseDto> {
  const result = await apiRequest<LoginResponseDto>(
    "/admin/auth/login",
    {
      method: "POST",
      body: JSON.stringify(credentials),
      skipAuthRefresh: true,
    },
  );

  setAccessToken(result.accessToken);
  return result;
}

export async function getCurrentAdmin(): Promise<AdminUser> {
  const response = await apiRequest<
    AdminUser | { admin: AdminUser }
  >("/admin/auth/me");

  if ("admin" in response && response.admin) {
    return response.admin;
  }

  return response as AdminUser;
}

export async function tryRestoreAdminSession():
  Promise<AdminUser | null> {
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
  await apiRequest("/admin/auth/logout", {
    method: "POST",
    skipAuthRefresh: true,
  });

  setAccessToken(null);
}

export async function logoutAllAdminSessions():
  Promise<void> {
  await apiRequest("/admin/auth/logout-all", {
    method: "POST",
    skipAuthRefresh: true,
  });

  setAccessToken(null);
}
