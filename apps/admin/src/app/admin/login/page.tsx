'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      setPassword('');
      router.replace('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally { setPending(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <span className="inline-block rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
          GLOBAL LEARNING PLATFORM
        </span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Admin CMS Sign In</h1>
        <p className="mt-1 text-sm text-slate-500">Secure administration for languages, courses and applications.</p>
        {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-semibold uppercase text-slate-600">Email Address</label>
            <input id="admin-email" type="email" required autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none" />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold uppercase text-slate-600">Password</label>
            <input id="admin-password" type="password" required autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none" />
          </div>
          <button type="submit" disabled={pending}
            className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            {pending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
