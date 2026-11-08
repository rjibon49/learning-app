'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUser, LoginRequestDto } from '@/types/auth';
import {
  loginAdmin,
  logoutAdmin,
  logoutAllAdminSessions,
  tryRestoreAdminSession,
} from '@/lib/api/auth';
import { onSessionExpired, setAccessToken } from '@/lib/api/client';

interface AuthContextValue {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequestDto) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    onSessionExpired(() => {
      if (isMounted) {
        setAccessToken(null);
        setAdmin(null);
        // শুধুমাত্র রিস্টোরেশন ফেইলিওর বা সেশন এক্সপায়ার্ড হলে রিডাইরেক্ট করবে
        router.replace('/admin/login');
      }
    });

    async function bootstrap() {
      try {
        const restoredAdmin = await tryRestoreAdminSession();
        if (isMounted && restoredAdmin) {
          setAdmin(restoredAdmin);
        }
      } catch {
        if (isMounted) {
          setAdmin(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const login = useCallback(async (credentials: LoginRequestDto) => {
    const result = await loginAdmin(credentials);
    setAdmin(result.admin);
  }, []);

  const logout = useCallback(async () => {
    await logoutAdmin();
    setAdmin(null);
    router.replace('/admin/login');
  }, [router]);

  const logoutAll = useCallback(async () => {
    await logoutAllAdminSessions();
    setAdmin(null);
    router.replace('/admin/login');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      isLoading,
      isAuthenticated: Boolean(admin),
      login,
      logout,
      logoutAll,
    }),
    [admin, isLoading, login, logout, logoutAll]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}