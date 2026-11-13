
"use client";

import {
  Suspense,
  useEffect,
  type ReactNode,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  AuthProvider,
  useAuth,
} from "@/lib/auth/auth-context";

import { AdminShell } from "@/components/layout/admin-shell";

const LOGIN_PATH = "/admin/login";
const DASHBOARD_PATH = "/admin/dashboard";

function LoadingScreen({
  message = "Verifying admin session...",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        <p className="mt-3 text-sm font-medium text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}

function AdminGuard({
  children,
}: {
  children: ReactNode;
}) {
  const {
    isAuthenticated,
    isLoading,
  } = useAuth();

  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === LOGIN_PATH;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isLoginPage) {
      router.replace(LOGIN_PATH);
      return;
    }

    if (isAuthenticated && isLoginPage) {
      router.replace(DASHBOARD_PATH);
    }
  }, [
    isLoading,
    isAuthenticated,
    isLoginPage,
    router,
  ]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    if (isLoginPage) {
      return <>{children}</>;
    }

    return (
      <LoadingScreen message="Redirecting to login..." />
    );
  }

  if (isLoginPage) {
    return (
      <LoadingScreen message="Opening dashboard..." />
    );
  }

  return <AdminShell>{children}</AdminShell>;
}

export default function AdminRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <AdminGuard>{children}</AdminGuard>
      </Suspense>
    </AuthProvider>
  );
}
