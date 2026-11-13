
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  Globe2,
  Plus,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";

import {
  createLanguage,
  getFrameworks,
  getLanguageLevels,
  getLanguages,
  updateLanguage,
} from "@/lib/api/languages";

import type {
  LearningLanguage,
  ProficiencyFramework,
  ProficiencyLevel,
} from "@/types/app";

import { Pagination } from "@/components/ui/pagination";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/state-views";

type LanguageForm = {
  code: string;
  name: string;
  nativeName: string;
  direction: "LTR" | "RTL";
  isActive: boolean;
  sortOrder: number;
};

const defaultForm: LanguageForm = {
  code: "",
  name: "",
  nativeName: "",
  direction: "LTR",
  isActive: true,
  sortOrder: 0,
};

export default function LanguagesPage() {
  const { admin } = useAuth();

  const canManage =
    admin?.role === "SUPER_ADMIN" ||
    admin?.role === "ADMIN";

  const [languages, setLanguages] =
    useState<LearningLanguage[]>([]);

  const [frameworks, setFrameworks] =
    useState<ProficiencyFramework[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [editingCode, setEditingCode] =
    useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] =
    useState<LanguageForm>(defaultForm);

  const [expandedCode, setExpandedCode] =
    useState<string | null>(null);

  const [expandedLevels, setExpandedLevels] =
    useState<ProficiencyLevel[]>([]);

  const [loadingLevels, setLoadingLevels] =
    useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [languageList, frameworkList] =
        await Promise.all([
          getLanguages(),
          getFrameworks(),
        ]);

      setLanguages(
        [...languageList].sort(
          (a, b) =>
            (a.sortOrder ?? 0) -
            (b.sortOrder ?? 0),
        ),
      );

      setFrameworks(frameworkList);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load languages",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return languages;

    return languages.filter((language) =>
      [
        language.code,
        language.name,
        language.nativeName,
      ].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [languages, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / limit),
  );

  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );

  function beginCreate() {
    setEditingCode(null);
    setForm(defaultForm);
    setShowForm(true);
    setError(null);
  }

  function beginEdit(language: LearningLanguage) {
    setEditingCode(language.code);
    setForm({
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      direction: language.direction,
      isActive: language.isActive !== false,
      sortOrder: language.sortOrder ?? 0,
    });
    setShowForm(true);
    setError(null);
  }

  async function save() {
    if (!canManage) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (editingCode) {
        await updateLanguage(editingCode, {
          name: form.name.trim(),
          nativeName: form.nativeName.trim(),
          direction: form.direction,
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        });
      } else {
        await createLanguage({
          code: form.code.trim().toLowerCase(),
          name: form.name.trim(),
          nativeName: form.nativeName.trim(),
          direction: form.direction,
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        });
      }

      setShowForm(false);
      setEditingCode(null);
      setMessage("Language saved successfully.");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save language",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleLevels(code: string) {
    if (expandedCode === code) {
      setExpandedCode(null);
      return;
    }

    setExpandedCode(code);
    setExpandedLevels([]);
    setLoadingLevels(true);

    try {
      const response = await getLanguageLevels(code);

      const assigned = response.assignments
        .filter((item) => item.isActive !== false)
        .map((item) => item.level)
        .filter(
          (level): level is ProficiencyLevel =>
            Boolean(level?.id),
        );

      setExpandedLevels(
        assigned.length
          ? assigned
          : response.levels,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load language levels",
      );
    } finally {
      setLoadingLevels(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Globe2 className="h-6 w-6 text-indigo-600" />
            Language Manager
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Global learning languages and proficiency frameworks.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-300 p-2.5"
            aria-label="Reload languages"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={beginCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add Language
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
          onRetry={() => void load()}
        />
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Proficiency Frameworks
        </h2>

        <div className="mt-4 flex flex-wrap gap-3">
          {frameworks.map((framework) => (
            <div
              key={framework.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="font-bold text-indigo-700">
                {framework.code}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {framework.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      {showForm && canManage && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editingCode
              ? `Edit ${editingCode.toUpperCase()}`
              : "Add Language"}
          </h2>

          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <label className="space-y-1 text-sm">
              <span className="font-medium">Language Code</span>
              <input
                required
                disabled={Boolean(editingCode)}
                value={form.code}
                onChange={(e) =>
                  setForm((old) => ({
                    ...old,
                    code: e.target.value.toLowerCase(),
                  }))
                }
                className="w-full rounded-lg border border-slate-300 p-2.5 disabled:bg-slate-100"
                placeholder="de"
                maxLength={16}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">English Name</span>
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((old) => ({
                    ...old,
                    name: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 p-2.5"
                placeholder="German"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Native Name</span>
              <input
                required
                value={form.nativeName}
                onChange={(e) =>
                  setForm((old) => ({
                    ...old,
                    nativeName: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 p-2.5"
                placeholder="Deutsch"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Writing Direction</span>
              <select
                value={form.direction}
                onChange={(e) =>
                  setForm((old) => ({
                    ...old,
                    direction: e.target.value as "LTR" | "RTL",
                  }))
                }
                className="w-full rounded-lg border border-slate-300 p-2.5"
              >
                <option value="LTR">Left to Right</option>
                <option value="RTL">Right to Left</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Sort Order</span>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((old) => ({
                    ...old,
                    sortOrder: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-slate-300 p-2.5"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((old) => ({
                    ...old,
                    isActive: e.target.checked,
                  }))
                }
              />
              Active Language
            </label>

            <div className="flex gap-2 sm:col-span-2">
              <button
                disabled={saving}
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Language"}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Search languages..."
          aria-label="Search languages"
          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
        />
      </section>

      {loading ? (
        <LoadingState label="Loading languages..." />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No languages found"
          description="Change the search or add a language."
        />
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Language</th>
                  <th className="px-5 py-4">Code</th>
                  <th className="px-5 py-4">Direction</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visible.map((language) => (
                  <tr key={language.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {language.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {language.nativeName}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-mono">
                      {language.code}
                    </td>

                    <td className="px-5 py-4">
                      {language.direction}
                    </td>

                    <td className="px-5 py-4">
                      <span className={
                        language.isActive !== false
                          ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                          : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                      }>
                        {language.isActive !== false && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {language.isActive !== false
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void toggleLevels(language.code)
                          }
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                        >
                          {expandedCode === language.code
                            ? "Hide Levels"
                            : "View Levels"}
                        </button>

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => beginEdit(language)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expandedCode && (
            <div className="border-t border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold">
                Levels for {expandedCode.toUpperCase()}
              </h3>

              {loadingLevels ? (
                <p className="mt-2 text-sm text-slate-500">
                  Loading levels...
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {expandedLevels.length ? (
                    expandedLevels.map((level) => (
                      <span
                        key={level.id}
                        className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700"
                      >
                        {level.code}
                        {level.framework?.code
                          ? ` · ${level.framework.code}`
                          : ""}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      No assigned levels found.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="p-4">
            <Pagination
              pagination={{
                page: currentPage,
                limit,
                total: filtered.length,
                totalPages,
              }}
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
