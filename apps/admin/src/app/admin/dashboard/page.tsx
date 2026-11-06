'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getApiHealth, type HealthStatusResponse } from '@/lib/api/auth';
import {
  getAdminVocabularyList,
  getVocabularyCategories,
} from '@/lib/api/vocabulary';
import { ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminDashboardPage() {
  const { apps, selectedApp, selectAppById, isLoadingApps } = useAppLevel();

  const [health, setHealth] = useState<HealthStatusResponse | null>(null);
  const [totalVocab, setTotalVocab] = useState<number | null>(null);
  const [publishedVocab, setPublishedVocab] = useState<number | null>(null);
  const [draftVocab, setDraftVocab] = useState<number | null>(null);
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!selectedApp) return;
    setLoadingMetrics(true);
    setMetricsError(null);

    try {
      const [vocabItems, categories, healthStatus] = await Promise.all([
        getAdminVocabularyList({ appId: selectedApp.id }),
        getVocabularyCategories(selectedApp.id),
        getApiHealth().catch(() => null),
      ]);

      const appScopedVocab = vocabItems.filter(
        (item) => item.appId === selectedApp.id
      );
      const pubCount = appScopedVocab.filter((item) => item.isPublished).length;

      setTotalVocab(appScopedVocab.length);
      setPublishedVocab(pubCount);
      setDraftVocab(appScopedVocab.length - pubCount);
      setCategoryCount(
        categories.filter((c) => c.appId === selectedApp.id).length
      );
      setHealth(healthStatus);
    } catch (err) {
      setMetricsError(
        err instanceof Error ? err.message : 'Failed to load dashboard metrics.'
      );
    } finally {
      setLoadingMetrics(false);
    }
  }, [selectedApp]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  if (isLoadingApps) {
    return <LoadingState label="Loading German levels..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard {selectedApp ? `— ${selectedApp.name}` : ''}
          </h1>
          <p className="text-sm text-slate-500">
            Real-time metrics for the active German level (`appId:{' '}
            {selectedApp?.id ?? '—'}`).
          </p>
        </div>

        {health && (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            API: {health.status} • DB: {health.database}
          </div>
        )}
      </div>

      {metricsError && (
        <ErrorState message={metricsError} onRetry={loadDashboardData} />
      )}

      {/* Real & Unimplemented Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Vocabulary Count ({selectedApp?.level ?? '—'})
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loadingMetrics ? '...' : totalVocab ?? '—'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Published Vocabulary
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {loadingMetrics ? '...' : publishedVocab ?? '—'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Draft / Unpublished Vocabulary
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {loadingMetrics ? '...' : draftVocab ?? '—'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Vocabulary Categories
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loadingMetrics ? '...' : categoryCount ?? '—'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Course / Lesson Count
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-400">—</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Flashcard Count
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-400">—</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Quiz Count
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-400">—</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Media Count
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-400">—</p>
        </div>
      </div>

      {/* A1-C1 App Switcher Cards */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Platform German Levels (A1–C1)
          </h2>
          <Link
            href="/admin/vocabulary/new"
            className="rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            + Add Vocabulary to {selectedApp?.level ?? 'Level'}
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
          {apps.map((app) => {
            const isSelected = selectedApp?.id === app.id;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => selectAppById(app.id)}
                className={`flex flex-col items-start rounded-lg border p-4 text-left transition ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="text-lg font-bold">{app.level}</span>
                <span
                  className={`text-xs ${
                    isSelected ? 'text-slate-200' : 'text-slate-600'
                  }`}
                >
                  {app.name}
                </span>
                <span
                  className={`mt-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    app.isActive
                      ? isSelected
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {app.isActive ? 'Active' : 'Inactive'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}