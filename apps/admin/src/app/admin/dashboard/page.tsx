'use client';

import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import {
  Activity, ArrowUpRight, BookOpen, CheckCircle2, CircleAlert,
  ClipboardList, FileStack, FolderOpen, GraduationCap, Layers3,
  LayoutGrid, Megaphone, RefreshCw, Users, Video, Bell,
} from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { apiRequest } from '@/lib/api/client';
import { getApiHealth, type HealthStatusResponse } from '@/lib/api/auth';
import { ErrorState, LoadingState } from '@/components/feedback/state-views';

type MetricKey =
  | 'vocabulary' | 'published' | 'categories' | 'courses'
  | 'flashcards' | 'quizzes' | 'media';

type Metrics = Record<MetricKey, number | null>;
type MetricErrors = Partial<Record<MetricKey, string>>;
type PagedResponse = { data: unknown[]; pagination: { total: number } };
type CategoryResponse = unknown[] | { data?: unknown[]; items?: unknown[] };

const EMPTY_METRICS: Metrics = {
  vocabulary: null, published: null, categories: null, courses: null,
  flashcards: null, quizzes: null, media: null,
};

const CARDS: Array<{
  key: MetricKey; title: string; href: string; icon: ComponentType<{ className?: string }>;
  hint: string; color: string;
}> = [
  { key: 'vocabulary', title: 'Language Vocabulary', href: '/admin/vocabulary', icon: BookOpen, hint: 'Shared across levels of this language', color: 'text-indigo-700 bg-indigo-50' },
  { key: 'published', title: 'Published Vocabulary', href: '/admin/vocabulary', icon: CheckCircle2, hint: 'Shared across levels of this language', color: 'text-emerald-700 bg-emerald-50' },
  { key: 'categories', title: 'Global Categories', href: '/admin/vocabulary/categories', icon: FolderOpen, hint: 'Shared taxonomy across applications', color: 'text-violet-700 bg-violet-50' },
  { key: 'courses', title: 'Courses', href: '/admin/courses', icon: GraduationCap, hint: 'Assigned to selected app', color: 'text-sky-700 bg-sky-50' },
  { key: 'flashcards', title: 'Flashcard Decks', href: '/admin/flashcards', icon: LayoutGrid, hint: 'Decks in selected app', color: 'text-orange-700 bg-orange-50' },
  { key: 'quizzes', title: 'Quizzes', href: '/admin/quizzes', icon: ClipboardList, hint: 'Quizzes in selected app', color: 'text-rose-700 bg-rose-50' },
  { key: 'media', title: 'Media Assets', href: '/admin/media', icon: Video, hint: 'Assets assigned to selected app', color: 'text-teal-700 bg-teal-50' },
];

const QUICK_LINKS = [
  { title: 'Announcements', caption: 'Content, scheduling and placements', href: '/admin/announcements', icon: Megaphone },
  { title: 'Audience Segments', caption: 'Target notifications by audience', href: '/admin/announcements/audiences', icon: Users },
  { title: 'Notification Queue', caption: 'Review queued deliveries', href: '/admin/notifications/queue', icon: Bell },
  { title: 'Subscriptions', caption: 'Subscriptions, cancellations and refunds', href: '/admin/subscriptions', icon: Layers3 },
  { title: 'Courses & Lessons', caption: 'Organize learning content', href: '/admin/courses', icon: FileStack },
  { title: 'Bulk Imports', caption: 'Upload and track content imports', href: '/admin/imports', icon: FolderOpen },
];

function queryPath(path: string, params: Record<string, string>): string {
  return `${path}?${new URLSearchParams({ ...params, page: '1', limit: '1' }).toString()}`;
}

async function getTotal(path: string, filters: Record<string, string>): Promise<number> {
  const result = await apiRequest<PagedResponse>(queryPath(path, filters));
  const total = result?.pagination?.total;
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error('The API did not return a valid pagination total.');
  }
  return total;
}

async function getCategoryTotal(): Promise<number> {
  // Existing admin category endpoint returns the full collection, not a paginated count.
  const result = await apiRequest<CategoryResponse>('/admin/vocabulary/categories');
  const items = Array.isArray(result) ? result : result?.data ?? result?.items;
  if (!Array.isArray(items)) throw new Error('Invalid categories response.');
  return items.length;
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'Data is temporarily unavailable.';
}

export default function AdminDashboardPage() {
  const { apps, selectedApp, selectAppById, isLoadingApps, appsError, reloadApps } = useAppLevel();
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [metricErrors, setMetricErrors] = useState<MetricErrors>({});
  const [health, setHealth] = useState<HealthStatusResponse | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const appId = selectedApp?.id;

  useEffect(() => {
    let active = true;
    void getApiHealth().then((result) => {
      if (active) { setHealth(result); setHealthError(false); }
    }).catch(() => {
      if (active) { setHealth(null); setHealthError(true); }
    });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    if (!appId) return () => { active = false; };

    // Request independent metrics so one unavailable service does not hide others.
    const requests: Record<MetricKey, () => Promise<number>> = {
      vocabulary: () => getTotal('/admin/vocabulary', { appId }),
      published: () => getTotal('/admin/vocabulary', { appId, status: 'PUBLISHED' }),
      categories: () => getCategoryTotal(),
      courses: () => getTotal('/admin/courses', { appId }),
      flashcards: () => getTotal('/admin/flashcards/decks', { appId }),
      quizzes: () => getTotal('/admin/quizzes', { appId }),
      media: () => getTotal('/media', { appId }),
    };

    const load = async () => {
      setLoading(true);
      setMetrics(EMPTY_METRICS);
      setMetricErrors({});
      const keys = Object.keys(requests) as MetricKey[];
      const results = await Promise.allSettled(keys.map((key) => requests[key]()));
      if (!active) return;
      const next: Metrics = { ...EMPTY_METRICS };
      const errors: MetricErrors = {};
      results.forEach((result, index) => {
        const key = keys[index];
        if (result.status === 'fulfilled') next[key] = result.value;
        else errors[key] = readableError(result.reason);
      });
      setMetrics(next);
      setMetricErrors(errors);
      setLastUpdated(new Date());
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [appId, refresh]);

  if (isLoadingApps) return <LoadingState label="Loading learning applications..." />;

  const unpublished = metrics.vocabulary !== null && metrics.published !== null
    ? Math.max(0, metrics.vocabulary - metrics.published) : null;
  const completion = metrics.vocabulary && metrics.published !== null
    ? Math.round((metrics.published / metrics.vocabulary) * 100) : 0;
  const selectedName = selectedApp?.name ?? 'No app selected';

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">Learning Management</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Content overview for <span className="font-semibold text-slate-700">{selectedName}</span>.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${health?.status === 'ok' && health.database === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            <span className={`h-2 w-2 rounded-full ${health?.status === 'ok' && health.database === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {health ? `API ${health.status} · DB ${health.database}` : healthError ? 'API status unavailable' : 'Checking API...'}
          </span>
          <button type="button" onClick={() => setRefresh((n) => n + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      {appsError && <ErrorState message={appsError} onRetry={() => void reloadApps()} />}
      {!selectedApp && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Select an active learning application to view its metrics.</div>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Learning Applications</h2>
            <p className="mt-1 text-xs text-slate-500">Choose an active level. Vocabulary is language-scoped and categories are global.</p>
          </div>
          <Link href="/admin/apps" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-900">Manage apps <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {apps.map((app) => {
            const isSelected = selectedApp?.id === app.id;
            return (
              <button key={app.id} type="button" disabled={!app.isActive} onClick={() => selectAppById(app.id)} aria-pressed={isSelected}
                className={`rounded-xl border p-3 text-left transition ${isSelected ? 'border-indigo-700 bg-indigo-700 text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-indigo-300 hover:bg-indigo-50'} disabled:cursor-not-allowed disabled:opacity-50`}>
                <span className="text-lg font-bold">{app.level}</span>
                <span className={`mt-1 block truncate text-xs ${isSelected ? 'text-indigo-100' : 'text-slate-600'}`} title={app.name}>{app.name}</span>
                <span className={`mt-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${isSelected ? 'bg-white/20 text-white' : app.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{app.isActive ? 'Active' : 'Inactive'}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-slate-900">Content Metrics</h2><p className="text-xs text-slate-500">Database totals from existing APIs; vocabulary is shared by language, categories are global.</p></div>
          {lastUpdated && <p className="text-xs text-slate-400">Last refreshed {lastUpdated.toLocaleTimeString()}</p>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.key} href={card.href} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className={`rounded-lg p-2.5 ${card.color}`}><Icon className="h-5 w-5" /></div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{card.title}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{loading ? '…' : metrics[card.key] === null ? '—' : metrics[card.key]?.toLocaleString()}</p>
                <p className="mt-2 text-xs text-slate-500" title={metricErrors[card.key]}>{metricErrors[card.key] ? 'Metric unavailable' : card.hint}</p>
              </Link>
            );
          })}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="inline-flex rounded-lg bg-amber-50 p-2.5 text-amber-700"><CircleAlert className="h-5 w-5" /></div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Unpublished Vocabulary</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{loading ? '…' : unpublished?.toLocaleString() ?? '—'}</p>
            <p className="mt-2 text-xs text-slate-500">All non-published states, including archived</p>
          </div>
        </div>
        {Object.keys(metricErrors).length > 0 && <p className="mt-3 text-xs text-amber-700">Some metrics could not be loaded. Check access permissions or API availability, then refresh.</p>}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-600" /><h2 className="font-semibold text-slate-900">Publication Progress</h2></div>
          <p className="mt-1 text-xs text-slate-500">Published vocabulary in the selected application</p>
          <div className="mt-6 flex items-baseline justify-between"><span className="text-3xl font-bold text-slate-900">{loading || metrics.vocabulary === null || metrics.published === null ? '—' : `${completion}%`}</span><span className="text-xs text-slate-500">{metrics.published ?? '—'} / {metrics.vocabulary ?? '—'}</span></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.min(completion, 100)}%` }} /></div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/admin/vocabulary/new" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700">+ Add Vocabulary</Link>
            <Link href="/admin/vocabulary" className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Manage Vocabulary</Link>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Quick Management</h2>
          <p className="mt-1 text-xs text-slate-500">Navigate to existing management pages</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return <Link key={link.href} href={link.href} className="group flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:border-indigo-200 hover:bg-indigo-50/50"><span className="rounded-lg bg-slate-100 p-2 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{link.title}</span><span className="block truncate text-xs text-slate-500">{link.caption}</span></span><ArrowUpRight className="h-4 w-4 text-slate-400" /></Link>;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
