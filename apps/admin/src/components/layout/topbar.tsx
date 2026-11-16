
"use client";

import { useState } from "react";

import { useAuth } from "@/lib/auth/auth-context";
import { useAppLevel } from "@/lib/auth/app-level-context";

export function Topbar({
  onOpenMobileMenu,
}: {
  onOpenMobileMenu: () => void;
}) {
  const {
    admin,
    logout,
    logoutAll,
  } = useAuth();

  const {
    apps,
    selectedApp,
    isLoadingApps,
    selectAppById,
  } = useAppLevel();

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [logoutError, setLogoutError] =
    useState<string | null>(null);

  async function handleLogout(all = false) {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      if (all) {
        await logoutAll();
      } else {
        await logout();
      }
    } catch {
      setLogoutError(
        "Unable to complete logout. Please try again.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 lg:px-8">
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
            value={selectedApp?.id ?? ""}
            onChange={(event) =>
              selectAppById(event.target.value)
            }
            className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
          >
            {apps.length === 0 ? (
              <option value="">
                {isLoadingApps
                  ? "Loading levels..."
                  : "No levels available"}
              </option>
            ) : (
              apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.level})
                  {!app.isActive ? " [Inactive]" : ""}
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
            <p className="text-xs font-medium text-slate-500">
              {admin.role}
            </p>
          </div>
        )}

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => void handleLogout(false)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {isLoggingOut ? "Please wait..." : "Logout"}
            </button>

            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => void handleLogout(true)}
              title="Revoke all active sessions across devices"
              className="hidden rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 md:inline-block"
            >
              Logout All
            </button>
          </div>

          {logoutError && (
            <p
              role="alert"
              className="max-w-64 text-right text-xs text-red-600"
            >
              {logoutError}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
