'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAppLevel } from '@/lib/auth/app-level-context';

export function Topbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { admin, logout, logoutAll } = useAuth();
  const { apps, selectedApp, isLoadingApps, selectAppById } = useAppLevel();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutAll = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAll();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        <div className="flex items-center gap-2">
          <label
            htmlFor="global-app-level-selector"
            className="hidden text-xs font-semibold uppercase tracking-wider text-slate-500 sm:inline"
          >
            Current Level:
          </label>
          <select
            id="global-app-level-selector"
            disabled={isLoadingApps || apps.length === 0}
            value={selectedApp?.id ?? ''}
            onChange={(e) => selectAppById(e.target.value)}
            className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
          >
            {apps.length === 0 ? (
              <option value="">
                {isLoadingApps ? 'Loading levels...' : 'No levels available'}
              </option>
            ) : (
              apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.level}){!app.isActive ? ' [Inactive]' : ''}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {admin && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">
              {admin.displayName || admin.email}
            </p>
            <p className="text-xs font-medium text-slate-500">{admin.role}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Logout
          </button>
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogoutAll}
            title="Revoke all active sessions across devices"
            className="hidden rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 md:inline-block"
          >
            Logout All
          </button>
        </div>
      </div>
    </header>
  );
}