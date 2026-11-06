'use client';

import React from 'react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminAppsPage() {
  const { apps, selectedApp, isLoadingApps, appsError, selectAppById, reloadApps } =
    useAppLevel();

  if (isLoadingApps) {
    return <LoadingState label="Loading German applications..." />;
  }

  if (appsError) {
    return <ErrorState message={appsError} onRetry={reloadApps} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          German Level Applications (A1–C1)
        </h1>
        <p className="text-sm text-slate-500">
          All five mobile applications and the public website consume this shared
          backend.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Application Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Backend App ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">CMS Context</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {apps.map((app) => {
              const isCurrent = selectedApp?.id === app.id;
              return (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {app.level}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {app.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {app.slug}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {app.id}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        app.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {app.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => selectAppById(app.id)}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:border-slate-200 disabled:bg-slate-900 disabled:text-white"
                    >
                      {isCurrent ? 'Selected in CMS' : 'Switch to Level'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}