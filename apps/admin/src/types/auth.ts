//apps/admin/src/types/auth.ts

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'CONTENT_EDITOR';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  admin: AdminUser;
  accessToken: string;
  accessTokenExpiresIn: number;
}

export interface RefreshResponseDto {
  accessToken: string;
  accessTokenExpiresIn: number;
}