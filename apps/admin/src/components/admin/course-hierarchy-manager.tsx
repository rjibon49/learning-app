
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { BookOpen, Layers, FileText, Plus, RefreshCw } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { useAppLevel } from "@/lib/auth/app-level-context";
import { getPublicLanguages } from "@/lib/api/languages";

import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  setCourseApps,
  getModules,
  createModule,
  updateModule,
  deleteModule,
  getLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  getLesson,
  saveLessonTranslation,
  type Course,
  type CourseModule,
  type Lesson,
  type PublicationStatus,
} from "@/lib/api/courses";

import type { LearningLanguage } from "@/types/app";
import { Pagination } from "@/components/ui/pagination";

type Mode = "courses" | "modules" | "lessons";
type RecordItem = Course | CourseModule | Lesson;

type EditorForm = {
  title: string;
  slug: string;
  description: string;
  status: PublicationStatus;
  sortOrder: number;
  estimatedMinutes: string;
};

const initialForm: EditorForm = {
  title: "",
  slug: "",
  description: "",
  status: "DRAFT",
  sortOrder: 0,
  estimatedMinutes: "",
};

const statusOptions: PublicationStatus[] = [
  "DRAFT",
  "REVIEW",
  "PUBLISHED",
  "ARCHIVED",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function errorText(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function isCourse(value: RecordItem): value is Course {
  return "languageId" in value;
}

function isLesson(value: RecordItem): value is Lesson {
  return "moduleId" in value;
}

export function CourseHierarchyManager({
  mode,
}: {
  mode: Mode;
}) {
  const { admin } = useAuth();
  const { selectedApp, isLoadingApps } = useAppLevel();

  const canEdit =
    admin?.role === "SUPER_ADMIN" ||
    admin?.role === "ADMIN" ||
    admin?.role === "CONTENT_EDITOR";

  const canArchive =
    admin?.role === "SUPER_ADMIN" ||
    admin?.role === "ADMIN";

  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [languages, setLanguages] = useState<LearningLanguage[]>([]);

  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EditorForm>(initialForm);

  const [translationLessonId, setTranslationLessonId] = useState("");
  const [translationLanguageId, setTranslationLanguageId] = useState("");
  const [translationContent, setTranslationContent] = useState("");
  const [savingTranslation, setSavingTranslation] = useState(false);

  const title =
    mode === "courses"
      ? "Courses"
      : mode === "modules"
        ? "Modules"
        : "Lessons";

  const Icon =
    mode === "courses"
      ? BookOpen
      : mode === "modules"
        ? Layers
        : FileText;

  const loadCourses = useCallback(async () => {
    if (!selectedApp) {
      setCourses([]);
      return;
    }

    const result = await getCourses(selectedApp.id);
    setCourses(result);
    setCourseId((previous) =>
      result.some((item) => item.id === previous)
        ? previous
        : (result[0]?.id ?? ""),
    );
  }, [selectedApp]);

  const loadModules = useCallback(async () => {
    if (!courseId || mode === "courses") {
      setModules([]);
      return;
    }

    const result = await getModules(courseId);
    setModules(result);
    setModuleId((previous) =>
      result.some((item) => item.id === previous)
        ? previous
        : (result[0]?.id ?? ""),
    );
  }, [courseId, mode]);

  const loadLessons = useCallback(async () => {
    if (!moduleId || mode !== "lessons") {
      setLessons([]);
      return;
    }

    const result = await getLessons(moduleId);
    setLessons(result);
  }, [moduleId, mode]);

  useEffect(() => {
    let active = true;

    void getPublicLanguages()
      .then((result) => {
        if (active) setLanguages(result);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!selectedApp) return;

    void getCourses(selectedApp.id)
      .then((result) => {
        if (!active) return;
        setCourses(result);
        setCourseId(result[0]?.id ?? "");
        setModuleId("");
        setSearch("");
        setPage(1);
      })
      .catch((err: unknown) => {
        if (active) setError(errorText(err));
      });

    return () => {
      active = false;
    };
  }, [selectedApp]);

  useEffect(() => {
    let active = true;

    if (mode === "courses" || !courseId) return;

    void getModules(courseId)
      .then((result) => {
        if (!active) return;
        setModules(result);
        setModuleId(result[0]?.id ?? "");
        setPage(1);
      })
      .catch((err: unknown) => {
        if (active) setError(errorText(err));
      });

    return () => {
      active = false;
    };
  }, [courseId, mode]);

  useEffect(() => {
    let active = true;

    if (mode !== "lessons" || !moduleId) return;

    void getLessons(moduleId)
      .then((result) => {
        if (active) {
          setLessons(result);
          setPage(1);
        }
      })
      .catch((err: unknown) => {
        if (active) setError(errorText(err));
      });

    return () => {
      active = false;
    };
  }, [moduleId, mode]);

  const records: RecordItem[] = useMemo(() => {
    if (mode === "courses") return courses;
    if (mode === "modules") return modules;
    return lessons;
  }, [mode, courses, modules, lessons]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...records]
      .filter(
        (item) =>
          !term ||
          item.title.toLowerCase().includes(term) ||
          item.slug.toLowerCase().includes(term),
      )
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.title.localeCompare(b.title),
      );
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (safePage - 1) * limit,
    safePage * limit,
  );

  async function reload() {
    setLoading(true);
    setError("");

    try {
      if (mode === "courses") await loadCourses();
      if (mode === "modules") await loadModules();
      if (mode === "lessons") await loadLessons();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...initialForm,
      sortOrder: records.length,
    });
    setNotice("");
    setError("");
    setFormOpen(true);
  }

  function openEdit(item: RecordItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug,
      description:
        isCourse(item) || !isLesson(item)
          ? item.description ?? ""
          : "",
      status: item.status,
      sortOrder: item.sortOrder,
      estimatedMinutes: isLesson(item)
        ? String(item.estimatedMinutes ?? "")
        : "",
    });
    setNotice("");
    setError("");
    setFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedApp || !canEdit) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const basic = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        status: form.status,
        sortOrder: form.sortOrder,
      };

      if (mode === "courses") {
        const input = {
          ...basic,
          description: form.description.trim() || null,
          languageId: selectedApp.languageId,
          levelId: selectedApp.levelId,
        };

        if (editingId) {
          await updateCourse(editingId, input);
        } else {
          const created = await createCourse(input);

          try {
            await setCourseApps(created.id, [selectedApp.id]);
          } catch (err) {
            setNotice(
              `Course created, but linking to ${selectedApp.name} failed: ${errorText(err)}`,
            );
          }
        }
      } else if (mode === "modules") {
        if (!courseId) throw new Error("Select a course first.");

        if (editingId) {
          await updateModule(editingId, {
            ...basic,
            description: form.description.trim() || null,
          });
        } else {
          await createModule({
            ...basic,
            courseId,
            description: form.description.trim() || null,
          });
        }
      } else {
        if (!moduleId) throw new Error("Select a module first.");

        const minutes = form.estimatedMinutes.trim()
          ? Number(form.estimatedMinutes)
          : null;

        if (
          minutes !== null &&
          (!Number.isInteger(minutes) || minutes < 1)
        ) {
          throw new Error(
            "Estimated minutes must be a positive whole number.",
          );
        }

        if (editingId) {
          await updateLesson(editingId, {
            ...basic,
            estimatedMinutes: minutes,
          });
        } else {
          await createLesson({
            ...basic,
            moduleId,
            estimatedMinutes: minutes,
          });
        }
      }

      setFormOpen(false);
      await reload();
      setNotice((previous) => previous || `${title.slice(0, -1)} saved.`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function archive(item: RecordItem) {
    if (!canArchive) return;

    if (
      !window.confirm(
        `Archive "${item.title}"? It will be hidden from published content.`,
      )
    ) {
      return;
    }

    setError("");

    try {
      if (mode === "courses") await deleteCourse(item.id);
      else if (mode === "modules") await deleteModule(item.id);
      else await deleteLesson(item.id);

      await reload();
      setNotice(`${item.title} archived.`);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function editTranslations(lesson: Lesson) {
    setError("");

    try {
      const detail = await getLesson(lesson.id);
      const first = detail.translations?.[0];

      setTranslationLessonId(lesson.id);
      setTranslationLanguageId(
        first?.languageId ?? selectedApp?.languageId ?? "",
      );
      setTranslationContent(first?.content ?? "");
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function saveTranslation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!translationLessonId || !translationLanguageId) return;

    setSavingTranslation(true);
    setError("");

    try {
      await saveLessonTranslation(translationLessonId, {
        languageId: translationLanguageId,
        content: translationContent,
        format: "MARKDOWN",
      });

      setNotice("Lesson translation saved.");
      setTranslationLessonId("");
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSavingTranslation(false);
    }
  }

  const canCreate =
    Boolean(selectedApp) &&
    (mode === "courses" ||
      (mode === "modules" && Boolean(courseId)) ||
      (mode === "lessons" && Boolean(moduleId)));

  if (isLoadingApps) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Loading applications...
      </p>
    );
  }

  if (!selectedApp) {
    return (
      <p className="rounded-xl bg-white p-6 text-slate-600">
        Select an application from the top navigation first.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Icon className="h-6 w-6 text-indigo-600" />
            {title}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {selectedApp.language.name} · {selectedApp.name}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-lg border border-slate-300 p-2"
            aria-label="Reload"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {canEdit && (
            <button
              type="button"
              disabled={!canCreate}
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Add {title.slice(0, -1)}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      {mode !== "courses" && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-semibold">Course</span>
            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setModuleId("");
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 p-2.5"
            >
              {courses.length === 0 && (
                <option value="">No courses available</option>
              )}
              {courses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          {mode === "lessons" && (
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Module</span>
              <select
                value={moduleId}
                onChange={(e) => {
                  setModuleId(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 p-2.5"
              >
                {modules.length === 0 && (
                  <option value="">No modules available</option>
                )}
                {modules.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={`Search ${title.toLowerCase()}...`}
          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Order</th>
                <th className="px-5 py-4">Title / Slug</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visible.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4 text-slate-500">
                    {item.sortOrder}
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="font-mono text-xs text-slate-400">
                      {item.slug}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">
                      {item.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      {mode === "lessons" && (
                        <button
                          type="button"
                          onClick={() => void editTranslations(item as Lesson)}
                          className="rounded-lg border px-3 py-1.5 text-xs"
                        >
                          Content
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-lg border px-3 py-1.5 text-xs"
                        >
                          Edit
                        </button>
                      )}

                      {canArchive && (
                        <button
                          type="button"
                          onClick={() => void archive(item)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                    No {title.toLowerCase()} found.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4">
          <Pagination
            pagination={{
              page: safePage,
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

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-bold">
              {editingId ? "Edit" : "Create"} {title.slice(0, -1)}
            </h2>

            <form onSubmit={(e) => void save(e)} className="space-y-4">
              <label className="block space-y-1 text-sm">
                <span className="font-semibold">Title</span>
                <input
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      title: e.target.value,
                      slug: editingId ? f.slug : slugify(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border p-2.5"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-semibold">Slug</span>
                <input
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  className="w-full rounded-lg border p-2.5"
                />
              </label>

              {mode !== "lessons" && (
                <label className="block space-y-1 text-sm">
                  <span className="font-semibold">Description</span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border p-2.5"
                  />
                </label>
              )}

              {mode === "lessons" && (
                <label className="block space-y-1 text-sm">
                  <span className="font-semibold">Estimated minutes</span>
                  <input
                    type="number"
                    min="1"
                    value={form.estimatedMinutes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        estimatedMinutes: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border p-2.5"
                  />
                </label>
              )}

              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1 text-sm">
                  <span className="font-semibold">Status</span>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as PublicationStatus,
                      }))
                    }
                    className="w-full rounded-lg border p-2.5"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1 text-sm">
                  <span className="font-semibold">Sort order</span>
                  <input
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sortOrder: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border p-2.5"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {translationLessonId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">
              Lesson Content / Translation
            </h2>

            <form
              onSubmit={(e) => void saveTranslation(e)}
              className="space-y-4"
            >
              <label className="block space-y-1 text-sm">
                <span className="font-semibold">Content Language</span>
                <select
                  required
                  value={translationLanguageId}
                  onChange={(e) => {
                    setTranslationLanguageId(e.target.value);
                    setTranslationContent("");
                  }}
                  className="w-full rounded-lg border p-2.5"
                >
                  <option value="">Choose language</option>
                  {languages.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-semibold">Markdown Content</span>
                <textarea
                  required
                  rows={12}
                  value={translationContent}
                  onChange={(e) => setTranslationContent(e.target.value)}
                  className="w-full rounded-lg border p-3 font-mono text-sm"
                  placeholder="Write lesson content using Markdown..."
                />
              </label>

              <p className="text-xs text-slate-500">
                Content is stored per language. Markdown will be rendered
                later in the learner website and mobile apps.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTranslationLessonId("")}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTranslation}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingTranslation ? "Saving..." : "Save Content"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
