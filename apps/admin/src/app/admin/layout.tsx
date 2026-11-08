//src/app/admin/layout.tsx

'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { AdminShell } from '@/components/layout/admin-shell';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // লোডিং শেষ, সেশন নেই এবং লগিন পেজেও নেই -> লগিন পেজে পাঠিয়ে দিন
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [isLoading, isAuthenticated, isLoginPage, router]);

  // সেশন চেক করার সময় ফুল-স্ক্রিন লোডিং দেখান
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-sm font-medium text-slate-500">Verifying session...</div>
      </div>
    );
  }

  // সেশন না থাকলে এবং লগিন পেজে না থাকলে রিডাইরেক্ট হওয়া পর্যন্ত এই মেসেজ দেখান (Next.js Error Fix)
  if (!isAuthenticated && !isLoginPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-sm font-medium text-slate-500">Redirecting to login...</div>
      </div>
    );
  }

  // লগিন পেজ হলে AdminShell (সাইডবার/হেডার) ছাড়া শুধু children রেন্ডার করুন 
  if (isLoginPage) {
    return <>{children}</>;
  }

  // সেশন থাকলে মেইন AdminShell সহ পেজ রেন্ডার করুন
  return <AdminShell>{children}</AdminShell>;
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // সম্পূর্ণ অ্যাপ বা লেআউটকে AuthProvider দিয়ে মুড়িয়ে দিন
    <AuthProvider>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">Loading layout...</div>}>
        <AdminGuard>
          {children}
        </AdminGuard>
      </Suspense>
    </AuthProvider>
  );
}