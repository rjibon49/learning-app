
"use client";
import { DeleteActions } from "@/components/ui/delete-actions";
import { deleteResource } from "@/lib/api/delete";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  Activity,
  ArrowDownAZ,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleX,
  Globe2,
  Languages,
  LayoutGrid,
  ListFilter,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  X,
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

type LanguageForm = {
  code: string;
  name: string;
  nativeName: string;
  direction: "LTR" | "RTL";
  isActive: boolean;
  sortOrder: number;
};

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type SortOption = "ORDER" | "NAME_ASC" | "NAME_DESC" | "CODE";

const createDefaultForm = (): LanguageForm => ({
  code: "",
  name: "",
  nativeName: "",
  direction: "LTR",
  isActive: true,
  sortOrder: 0,
});

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatCode(value: string) {
  return value.trim().toLowerCase();
}

function LanguageIcon({
  code,
  name,
}: {
  code: string;
  name: string;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "L";

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-xl font-bold text-indigo-700">
      <span aria-label={`${name} (${code})`}>{initial}</span>
    </div>
  );
}

function StatisticCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number;
  icon: typeof Globe2;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function LanguagesPage() {
  const { admin } = useAuth();

  const canManage =
    admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";

  const [languages, setLanguages] = useState<LearningLanguage[]>([]);
  const [frameworks, setFrameworks] = useState<ProficiencyFramework[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("ORDER");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const [form, setForm] = useState<LanguageForm>(
    createDefaultForm
  );

  const [expandedCode, setExpandedCode] = useState<string | null>(
    null
  );

  const [levelsByCode, setLevelsByCode] = useState<
    Record<string, ProficiencyLevel[]>
  >({});

  const [levelErrors, setLevelErrors] = useState<
    Record<string, string>
  >({});

  const [loadingLevelsCode, setLoadingLevelsCode] = useState<
    string | null
  >(null);

  const loadRequestRef = useRef(0);
  const levelRequestRef = useRef(0);

  const load = useCallback(async (silent = false) => {
    const requestId = ++loadRequestRef.current;

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [languageList, frameworkList] = await Promise.all([
        getLanguages(),
        getFrameworks(),
      ]);

      if (requestId !== loadRequestRef.current) return;

      setLanguages(
        [...languageList].sort(
          (a, b) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
            a.name.localeCompare(b.name)
        )
      );

      setFrameworks(frameworkList);
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;

      setError(
        errorMessage(err, "Unable to load languages and frameworks.")
      );
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();

    return () => {
      loadRequestRef.current += 1;
      levelRequestRef.current += 1;
    };
  }, [load]);

  const stats = useMemo(() => {
    const active = languages.filter(
      (language) => language.isActive !== false
    ).length;

    return {
      total: languages.length,
      active,
      inactive: languages.length - active,
      frameworks: frameworks.length,
    };
  }, [languages, frameworks]);

  const filteredLanguages = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = languages.filter((language) => {
      const matchesSearch =
        !query ||
        [
          language.code,
          language.name,
          language.nativeName,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(query)
        );

      const active = language.isActive !== false;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && active) ||
        (statusFilter === "INACTIVE" && !active);

      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "NAME_ASC":
          return a.name.localeCompare(b.name);

        case "NAME_DESC":
          return b.name.localeCompare(a.name);

        case "CODE":
          return a.code.localeCompare(b.code);

        default:
          return (
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
            a.name.localeCompare(b.name)
          );
      }
    });

    return result;
  }, [languages, search, statusFilter, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLanguages.length / limit)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleLanguages = filteredLanguages.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );

  const formValid = useMemo(() => {
    const code = formatCode(form.code);

    return (
      /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code) &&
      form.name.trim().length > 0 &&
      form.nativeName.trim().length > 0 &&
      Number.isInteger(form.sortOrder) &&
      form.sortOrder >= 0
    );
  }, [form]);

  function updateForm<K extends keyof LanguageForm>(
    key: K,
    value: LanguageForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function beginCreate() {
    if (!canManage) return;

    setEditingCode(null);
    setForm(createDefaultForm());
    setShowForm(true);
    setError(null);
    setNotice(null);
  }

  function beginEdit(language: LearningLanguage) {
    if (!canManage) return;

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
    setNotice(null);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingCode(null);
    setForm(createDefaultForm());
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage || saving) return;

    if (!formValid) {
      setError(
        "Please enter a valid language code, names, and sort order."
      );
      return;
    }

    const code = formatCode(form.code);

    if (
      !editingCode &&
      languages.some(
        (language) => language.code.toLowerCase() === code
      )
    ) {
      setError("A language with this code already exists.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload = {
        name: form.name.trim(),
        nativeName: form.nativeName.trim(),
        direction: form.direction,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
      };

      if (editingCode) {
        await updateLanguage(editingCode, payload);
      } else {
        await createLanguage({
          code,
          ...payload,
        });
      }

      setShowForm(false);
      setEditingCode(null);
      setForm(createDefaultForm());

      setNotice(
        editingCode
          ? "Language updated successfully."
          : "Language created successfully."
      );

      await load(true);
    } catch (err) {
      setError(errorMessage(err, "Unable to save language."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleLevels(code: string) {
    if (expandedCode === code) {
      levelRequestRef.current += 1;
      setExpandedCode(null);
      setLoadingLevelsCode(null);
      return;
    }

    const requestId = ++levelRequestRef.current;

    setExpandedCode(code);

    if (levelsByCode[code]) return;

    setLoadingLevelsCode(code);

    setLevelErrors((previous) => {
      const next = { ...previous };
      delete next[code];
      return next;
    });

    try {
      const response = await getLanguageLevels(code);

      if (requestId !== levelRequestRef.current) return;

      const activeAssignments = response.assignments
        .filter((assignment) => assignment.isActive !== false)
        .map((assignment) => assignment.level)
        .filter(
          (level): level is ProficiencyLevel =>
            Boolean(level?.id)
        );

      const levels = activeAssignments.length
        ? activeAssignments
        : response.levels;

      setLevelsByCode((previous) => ({
        ...previous,
        [code]: levels,
      }));
    } catch (err) {
      if (requestId !== levelRequestRef.current) return;

      setLevelErrors((previous) => ({
        ...previous,
        [code]: errorMessage(
          err,
          "Unable to load proficiency levels."
        ),
      }));
    } finally {
      if (requestId === levelRequestRef.current) {
        setLoadingLevelsCode(null);
      }
    }
  }

  /** Forget cached levels so the next "View Levels" loads fresh data. */
  function forgetLevels(code: string) {
    levelRequestRef.current += 1;
    setLevelsByCode((previous) => {
      const next = { ...previous };
      delete next[code];
      return next;
    });
    setExpandedCode(null);
    setLoadingLevelsCode(null);
  }

  async function refresh() {
    setNotice(null);
    setLevelsByCode({});
    setLevelErrors({});
    await load(true);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setSortBy("ORDER");
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* PAGE HEADER */}

      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-indigo-50 blur-2xl" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
              <Languages className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
                Global Learning Platform
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Language Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                Manage learning languages, writing directions,
                availability, and proficiency frameworks from one
                central workspace.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing || loading}
              className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>

            {canManage && (
              <button
                type="button"
                onClick={beginCreate}
                className={`${buttonClass} bg-indigo-600 text-white shadow-sm hover:bg-indigo-700`}
              >
                <Plus className="h-4 w-4" />
                Add Language
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ALERTS */}

      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>

          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* STATISTICS — TWO-COLUMN GRID */}

      <section
        aria-label="Language statistics"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
      >
        <StatisticCard
          title="Total Languages"
          value={stats.total}
          icon={Globe2}
          description="Registered languages"
        />

        <StatisticCard
          title="Active"
          value={stats.active}
          icon={CircleCheck}
          description="Available for learning"
        />

        <StatisticCard
          title="Inactive"
          value={stats.inactive}
          icon={CircleX}
          description="Currently disabled"
        />

        <StatisticCard
          title="Frameworks"
          value={stats.frameworks}
          icon={BookOpen}
          description="Proficiency standards"
        />
      </section>

      {/* CREATE / EDIT FORM */}

      {showForm && canManage && (
        <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-indigo-50/60 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white p-2 text-indigo-600 shadow-sm">
                {editingCode ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingCode
                    ? `Edit ${editingCode.toUpperCase()} Language`
                    : "Add New Language"}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Fields marked * are required.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              aria-label="Close language form"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form
            onSubmit={(event) => void save(event)}
            className="space-y-5 p-5 sm:p-6"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Language Code *
                </span>

                <input
                  type="text"
                  required
                  disabled={Boolean(editingCode) || saving}
                  value={form.code}
                  onChange={(event) =>
                    updateForm(
                      "code",
                      event.target.value.toLowerCase()
                    )
                  }
                  className={inputClass}
                  placeholder="e.g. de, en, fr"
                  maxLength={16}
                  autoComplete="off"
                  pattern="[a-z]{2,3}(-[a-z0-9]{2,8})*"
                />

                <p className="text-xs text-slate-400">
                  Unique code. Cannot be edited after creation.
                </p>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  English Name *
                </span>

                <input
                  type="text"
                  required
                  disabled={saving}
                  value={form.name}
                  onChange={(event) =>
                    updateForm("name", event.target.value)
                  }
                  className={inputClass}
                  placeholder="e.g. German"
                  maxLength={120}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Native Name *
                </span>

                <input
                  type="text"
                  required
                  disabled={saving}
                  value={form.nativeName}
                  onChange={(event) =>
                    updateForm("nativeName", event.target.value)
                  }
                  className={inputClass}
                  placeholder="e.g. Deutsch"
                  maxLength={120}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Writing Direction
                </span>

                <select
                  disabled={saving}
                  value={form.direction}
                  onChange={(event) =>
                    updateForm(
                      "direction",
                      event.target.value as "LTR" | "RTL"
                    )
                  }
                  className={inputClass}
                >
                  <option value="LTR">Left to Right (LTR)</option>
                  <option value="RTL">Right to Left (RTL)</option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Display Order
                </span>

                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  disabled={saving}
                  value={form.sortOrder}
                  onChange={(event) =>
                    updateForm(
                      "sortOrder",
                      Number(event.target.value)
                    )
                  }
                  className={inputClass}
                />

                <p className="text-xs text-slate-400">
                  Lower numbers appear first.
                </p>
              </label>

              <div className="flex items-center">
                <label className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Active Language
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Enable this language for the platform.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    disabled={saving}
                    checked={form.isActive}
                    onChange={(event) =>
                      updateForm("isActive", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                disabled={saving}
                onClick={closeForm}
                className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !formValid}
                className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {saving
                  ? "Saving..."
                  : editingCode
                    ? "Save Changes"
                    : "Create Language"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* FRAMEWORKS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">
                Proficiency Frameworks
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Available language learning standards.
              </p>
            </div>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {frameworks.length} Frameworks
          </span>
        </div>

        {loading ? (
          <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading frameworks...
          </div>
        ) : frameworks.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
            No proficiency frameworks available.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {frameworks.map((framework) => (
              <div
                key={framework.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-indigo-700 shadow-sm">
                  {framework.code.slice(0, 4).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {framework.code}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {framework.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* LANGUAGE LIST */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-indigo-600" />

                <h2 className="text-lg font-bold text-slate-900">
                  Learning Languages
                </h2>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Browse, manage, and view assigned proficiency levels.
              </p>
            </div>

            <span className="self-start rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
              {filteredLanguages.length} Results
            </span>
          </div>

          {/* FILTERS */}

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                aria-label="Search languages"
                placeholder="Search name, native name, or code..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className={`${inputClass} pl-10`}
              />
            </div>

            <div className="relative">
              <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(
                    event.target.value as StatusFilter
                  );
                  setPage(1);
                }}
                className={`${inputClass} pl-9`}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>

            <div className="relative">
              <ArrowDownAZ className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                aria-label="Sort languages"
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as SortOption);
                  setPage(1);
                }}
                className={`${inputClass} pl-9`}
              >
                <option value="ORDER">Display Order</option>
                <option value="NAME_ASC">Name A–Z</option>
                <option value="NAME_DESC">Name Z–A</option>
                <option value="CODE">Language Code</option>
              </select>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className={`${buttonClass} border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100`}
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        {/* TWO-COLUMN LANGUAGE GRID */}

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
              <p className="text-sm">Loading languages...</p>
            </div>
          ) : filteredLanguages.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
              <Globe2 className="h-10 w-10 text-slate-300" />

              <h3 className="mt-3 text-base font-bold text-slate-800">
                No languages found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {visibleLanguages.map((language) => {
                const active = language.isActive !== false;
                const expanded = expandedCode === language.code;

                const levels = levelsByCode[language.code] ?? [];
                const levelError = levelErrors[language.code];

                const levelLoading =
                  loadingLevelsCode === language.code;

                return (
                  <article
                    key={language.id}
                    className={`min-w-0 overflow-hidden rounded-2xl border bg-white transition hover:shadow-md ${
                      expanded
                        ? "border-indigo-300 shadow-sm ring-1 ring-indigo-100"
                        : "border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <LanguageIcon
                          code={language.code}
                          name={language.name}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-bold text-slate-900">
                              {language.name}
                            </h3>

                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                active
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {active ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <CircleX className="h-3 w-3" />
                              )}

                              {active ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm text-slate-500">
                            {language.nativeName}
                          </p>

                          <p className="mt-2 inline-flex rounded-md bg-indigo-50 px-2 py-1 font-mono text-xs font-semibold text-indigo-700">
                            {language.code.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] font-medium text-slate-500">
                            Writing Direction
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {language.direction}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] font-medium text-slate-500">
                            Display Order
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-800">
                            #{language.sortOrder ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            void toggleLevels(language.code)
                          }
                          aria-expanded={expanded}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                        >
                          {expanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}

                          {expanded ? "Hide Levels" : "View Levels"}
                        </button>

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => beginEdit(language)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit Language
                          </button>
                        )}

                        <DeleteActions
                          itemName={`${language.name} (${language.code})`}
                          entity="language"
                          archiveLabel="Deactivate"
                          canArchive={canManage}
                          hideArchive={!active}
                          archiveHelp="Hidden from apps and the website. Courses and words stay. Edit the language to activate it again."
                          permanentHelp="Refused while any course, word or app still uses this language — deactivate it instead."
                          onDelete={(permanent) =>
                            deleteResource(`/admin/languages/${encodeURIComponent(language.code)}`, permanent)
                          }
                          onDone={() => void load(true)}
                        />
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-indigo-100 bg-indigo-50/40 p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-indigo-600" />

                          <h4 className="text-sm font-bold text-slate-800">
                            Proficiency Levels
                          </h4>
                        </div>

                        {levelLoading ? (
                          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading assigned levels...
                          </div>
                        ) : levelError ? (
                          <div
                            role="alert"
                            className="mt-3 rounded-lg border border-rose-200 bg-white p-3 text-xs text-rose-700"
                          >
                            {levelError}

                            <button
                              type="button"
                              onClick={() => {
                                setLevelsByCode((previous) => {
                                  const next = { ...previous };
                                  delete next[language.code];
                                  return next;
                                });

                                setExpandedCode(null);
                                setLoadingLevelsCode(null);
                              }}
                              className="mt-2 block font-semibold underline"
                            >
                              Close and retry
                            </button>
                          </div>
                        ) : levels.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {levels.map((level) => (
                              <div
                                key={level.id}
                                className="rounded-lg border border-indigo-100 bg-white px-3 py-2 shadow-sm"
                              >
                                <p className="text-xs font-bold text-indigo-700">
                                  {level.code}
                                </p>

                                {level.framework?.code && (
                                  <p className="mt-0.5 text-[10px] text-slate-500">
                                    {level.framework.code}
                                  </p>
                                )}

                                <div className="mt-1.5">
                                  <DeleteActions
                                    compact
                                    itemName={`${level.code} for ${language.name}`}
                                    entity="level"
                                    archiveLabel="Disable"
                                    canArchive={canManage}
                                    archiveHelp="This level is no longer offered for the language. Content stays."
                                    permanentHelp="The level assignment row is removed."
                                    onDelete={(permanent) =>
                                      deleteResource(
                                        `/admin/languages/${encodeURIComponent(language.code)}/levels/${encodeURIComponent(level.id)}`,
                                        permanent,
                                      )
                                    }
                                    onDone={() => forgetLevels(language.code)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-slate-500">
                            No assigned proficiency levels found.
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* PAGINATION */}

        <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
          <Pagination
            pagination={{
              page: currentPage,
              limit,
              total: filteredLanguages.length,
              totalPages,
            }}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setLimit(size);
              setPage(1);
            }}
            isLoading={loading || refreshing}
          />
        </div>
      </section>

      {/* FOOTER INFORMATION */}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <Activity className="h-4 w-4" />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800">
              Language Availability
            </p>

            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Inactive languages remain registered but are not
              available for new learning activities where the API
              enforces active status.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800">
              Administrative Access
            </p>

            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Language creation and editing are available only
              to authorized Admin and Super Admin accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
