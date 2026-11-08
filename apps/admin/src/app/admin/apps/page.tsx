'use client';

import React from 'react';
import { Smartphone, CheckCircle, ArrowRight } from 'lucide-react';
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-indigo-600" />
          German Level Applications (A1–C1)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          All mobile applications and the public website consume this shared CMS and backend.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Level</th>
              <th className="px-6 py-4">Application Details</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">CMS Context</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {apps.map((app) => {
              const isCurrent = selectedApp?.id === app.id;
              return (
                <tr key={app.id} className={`transition-colors ${isCurrent ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                  <td className="px-6 py-4">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 font-bold text-indigo-700 border border-indigo-200 shadow-sm text-lg">
                      {app.level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 text-base">{app.name}</div>
                    <div className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-2">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">slug: {app.slug}</span>
                      <span className="text-slate-400">•</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">id: {app.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${
                        app.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {app.isActive ? <CheckCircle className="h-3.5 w-3.5" /> : null}
                      {app.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => selectAppById(app.id)}
                      className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-xs font-bold shadow-sm transition-colors border ${
                        isCurrent 
                          ? 'border-indigo-600 bg-indigo-600 text-white cursor-default' 
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                      }`}
                    >
                      {isCurrent ? (
                        <>Selected <CheckCircle className="h-3.5 w-3.5" /></>
                      ) : (
                        <>Switch to {app.level} <ArrowRight className="h-3.5 w-3.5" /></>
                      )}
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