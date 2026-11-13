
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import type {
  AdminUser,
  LoginRequestDto,
} from "@/types/auth";

import {
  loginAdmin,
  logoutAdmin,
  logoutAllAdminSessions,
  tryRestoreAdminSession,
} from "@/lib/api/auth";

import {
  onSessionExpired,
  setAccessToken,
} from "@/lib/api/client";

type AuthContextValue = {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequestDto) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
};

const LOGIN_PATH = "/admin/login";

const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const [admin, setAdmin] =
    useState<AdminUser | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const clearLocalSession = useCallback(() => {
    setAccessToken(null);
    setAdmin(null);
  }, []);

  useEffect(() => {
    let active = true;

    onSessionExpired(() => {
      if (!active) return;

      clearLocalSession();
      router.replace(LOGIN_PATH);
    });

    void tryRestoreAdminSession()
      .then((restored) => {
        if (!active) return;
        setAdmin(restored);
      })
      .catch(() => {
        if (!active) return;
        clearLocalSession();
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      onSessionExpired(null);
    };
  }, [router, clearLocalSession]);

  const login = useCallback(
    async (credentials: LoginRequestDto) => {
      const session = await loginAdmin(credentials);
      setAdmin(session.admin);
    },
    [],
  );

  const logout = useCallback(async () => {
    // Wait until the backend revokes the refresh token.
    // If it fails, keep the session and let the UI
    // report the error instead of pretending logout worked.
    await logoutAdmin();

    clearLocalSession();
    router.replace(LOGIN_PATH);
  }, [clearLocalSession, router]);

  const logoutAll = useCallback(async () => {
    await logoutAllAdminSessions();

    clearLocalSession();
    router.replace(LOGIN_PATH);
  }, [clearLocalSession, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      isLoading,
      isAuthenticated: Boolean(admin),
      login,
      logout,
      logoutAll,
    }),
    [admin, isLoading, login, logout, logoutAll],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return context;
}
