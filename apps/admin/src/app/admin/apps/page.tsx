
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  ArrowRight,
  CheckCircle2,
  Plus,
  RefreshCw,
  Smartphone,
} from "lucide-react";

import { useAppLevel } from "@/lib/auth/app-level-context";

import {
  createApp,
  getAdminApps,
  updateAppStatus,
} from "@/lib/api/apps";

import { getLanguages, getLanguageLevels } from "@/lib/api/languages";

import type {
  LearningApp,
  LearningLanguage,
  ProficiencyLevel,
} from "@/types/app";

import type { PaginationMeta } from "@/types/pagination";

import { Pagination } from "@/components/ui/pagination";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/state-views";

import { useAuth } from "@/lib/auth/auth-context";

const initialPagination: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

type AppForm = {
  name: string;
  slug: string;
  description: string;
  languageId: string;
  levelId: string;
};

const emptyForm: AppForm = {
  name: "",
  slug: "",
  description: "",
  languageId: "",
  levelId: "",
};

export default function AdminAppsPage() {
  const { admin } = useAuth();

  const {
    selectedApp,
    selectAppById,
    reloadApps,
  } = useAppLevel();

  const canManage =
    admin?.role === "SUPER_ADMIN" ||
    admin?.role === "ADMIN";

  const [apps, setApps] = useState<LearningApp[]>([]);
  const [languages, setLanguages] =
    useState<LearningLanguage[]>([]);
  const [levels, setLevels] =
    useState<ProficiencyLevel[]>([]);

  const [pagination, setPagination] =
    useState(initialPagination);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [search, setSearch] = useState("");
  const [filterLanguage, setFilterLanguage] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AppForm>(emptyForm);

  const loadApps = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminApps({
        page,
        limit,
        search: search || undefined,
        languageId: filterLanguage || undefined,
      });

      setApps(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load applications",
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterLanguage]);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  useEffect(() => {
    void getLanguages()
      .then(setLanguages)
      .catch(() => {
        // The app listing remains usable if the
        // language filter is temporarily unavailable.
      });
  }, []);

  useEffect(() => {
    const language = languages.find(
      (item) => item.id === form.languageId,
    );

    if (!language) return;

    let active = true;

    void getLanguageLevels(language.code)
      .then((response) => {
        if (!active) return;

        const enabled = response.assignments
          .filter((item) => item.isActive !== false)
          .map((item) => item.level)
          .filter(
            (item): item is ProficiencyLevel =>
              Boolean(item?.id),
          );

        setLevels(
          enabled.length
            ? enabled
            : response.levels,
        );
      })
      .catch(() => {
        if (active) setLevels([]);
      });

    return () => {
      active = false;
    };
  }, [form.languageId, languages]);

  function changeForm<K extends keyof AppForm>(
    key: K,
    value: AppForm[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "languageId" ? { levelId: "" } : {}),
    }));
  }

  async function handleCreate() {
    if (!canManage || !form.languageId) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await createApp({
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description.trim() || null,
        languageId: form.languageId,
        levelId: form.levelId || null,
      });

      setMessage("Application created successfully.");
      setShowCreate(false);
      setForm(emptyForm);

      await Promise.all([
        loadApps(),
        reloadApps(),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create application",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(app: LearningApp) {
    if (!canManage) return;

    const desired = !app.isActive;

    const confirmed = window.confirm(
      `${desired ? "Activate" : "Deactivate"} ${app.name}?`,
    );

    if (!confirmed) return;

    setError(null);
    setMessage(null);

    try {
      await updateAppStatus(app.id, {
        isActive: desired,
      });

      setMessage(
        `${app.name} ${desired ? "activated" : "deactivated"}.`,
      );

      await Promise.all([
        loadApps(),
        reloadApps(),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update application status",
      );
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Smartphone className="h-6 w-6 text-indigo-600" />
            Global Applications
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage language-specific applications and
            proficiency levels.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/languages"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Language Manager
          </Link>

          <button
            type="button"
            onClick={() => void loadApps()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50"
            aria-label="Reload applications"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => setShowCreate((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add App
            </button>
          )}
        </div>
      </div>

      {message && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <ErrorState
          message={error}
          onRetry={() => void loadApps()}
        />
      )}

      {showCreate && canManage && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Create Application
          </h2>

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreate();
            }}
          >
            <label className="space-y-1 text-sm">
              <span className="font-medium">App Name</span>
              <input
                required
                value={form.name}
                onChange={(e) =>
                  changeForm("name", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 p-2.5"
                placeholder="French A1"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">App Slug</span>
              <input
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={form.slug}
                onChange={(e) =>
                  changeForm("slug", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 p-2.5"
                placeholder="french-a1"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Language</span>
              <select
                required
                value={form.languageId}
                onChange={(e) =>
                  changeForm("languageId", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 p-2.5"
              >
                <option value="">Select language</option>
                {languages.filter((l) => l.isActive !== false).map(
                  (language) => (
                    <option key={language.id} value={language.id}>
                      {language.name} ({language.code})
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Proficiency Level</span>
              <select
                value={form.levelId}
                onChange={(e) =>
                  changeForm("levelId", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 p-2.5"
              >
                <option value="">General / No level</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.code} — {level.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium">Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  changeForm("description", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 p-2.5"
              />
            </label>

            <div className="flex gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Create App"}
              </button>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Search applications..."
            className="rounded-lg border border-slate-300 p-2.5 text-sm"
          />

          <select
            value={filterLanguage}
            onChange={(event) => {
              setPage(1);
              setFilterLanguage(event.target.value);
            }}
            className="rounded-lg border border-slate-300 p-2.5 text-sm"
          >
            <option value="">All languages</option>
            {languages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading applications..." />
      ) : apps.length === 0 ? (
        <EmptyState
          title="No applications found"
          description="Create an application or change the filters."
        />
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Application</th>
                  <th className="px-5 py-4">Language</th>
                  <th className="px-5 py-4">Level</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {apps.map((app) => {
                  const selected =
                    selectedApp?.id === app.id;

                  return (
                    <tr key={app.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {app.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {app.slug}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {app.language.name}
                        <span className="ml-1 text-slate-400">
                          ({app.language.code})
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {app.level}
                      </td>

                      <td className="px-5 py-4">
                        <span className={
                          app.isActive
                            ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                            : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                        }>
                          {app.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={selected || !app.isActive}
                            onClick={() => selectAppById(app.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                          >
                            {selected ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Selected
                              </>
                            ) : (
                              <>
                                Select
                                <ArrowRight className="h-3 w-3" />
                              </>
                            )}
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => void toggleStatus(app)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                            >
                              {app.isActive
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4">
            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setLimit(size);
                setPage(1);
              }}
              isLoading={loading}
            />
          </div>
        </section>
      )}
    </div>
  );
}
