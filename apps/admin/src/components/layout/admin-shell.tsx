'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { AppLevelProvider } from '@/lib/auth/app-level-context';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoginRoute = pathname === '/admin/login' || pathname === '/login';

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginRoute) {
      router.replace('/admin/login');
    }
    if (!isLoading && isAuthenticated && isLoginRoute) {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, isAuthenticated, isLoginRoute, router]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            Verifying admin session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLevelProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <Sidebar
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </AppLevelProvider>
  );
}