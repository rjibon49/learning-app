
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
import { DeleteActions } from "@/components/ui/delete-actions";
import { FormField, apiFieldErrors } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/feedback-provider";

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
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Non-Latin titles (Japanese, Bangla...) give an empty slug; fall back to a short unique one. */
function slugOrFallback(title: string, prefix: string): string {
  return slugify(title) || `${prefix}-${Date.now().toString(36)}`;
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type FormErrors = Partial<Record<keyof EditorForm, string>>;

function validateForm(form: EditorForm, mode: Mode): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = "Title is required.";
  else if (form.title.trim().length > 200) errors.title = "Keep the title under 200 characters.";
  if (form.slug.trim() && !SLUG_PATTERN.test(form.slug.trim())) {
    errors.slug = "Use lowercase English letters, numbers and single dashes (e.g. greetings-1).";
  }
  if (!Number.isInteger(form.sortOrder) || form.sortOrder < 0) {
    errors.sortOrder = "Order must be 0 or a positive whole number.";
  }
  if (mode === "lessons" && form.estimatedMinutes.trim()) {
    const minutes = Number(form.estimatedMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) {
      errors.estimatedMinutes = "Enter whole minutes between 1 and 600.";
    }
  }
  return errors;
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
  const toast = useToast();

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
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  const [translationLessonId, setTranslationLessonId] = useState("");
  const [translationLanguageId, setTranslationLanguageId] = useState("");
  const [translationContent, setTranslationContent] = useState("");
  const [translationTitle, setTranslationTitle] = useState("");
  const [lessonTranslations, setLessonTranslations] = useState<
    Array<{ languageId: string; content: string }>
  >([]);
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

  function nextSortOrder(): number {
    return records.reduce((max, item) => Math.max(max, item.sortOrder + 1), 0);
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...initialForm,
      sortOrder: nextSortOrder(),
    });
    setFormErrors({});
    setSlugTouched(false);
    setShowAdvanced(false);
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
    setFormErrors({});
    setSlugTouched(true);
    setShowAdvanced(false);
    setNotice("");
    setError("");
    setFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedApp || !canEdit || saving) return;

    const errors = validateForm(form, mode);
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      if (errors.slug || errors.sortOrder) setShowAdvanced(true);
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    const keepOpen = addAnother && !editingId;

    try {
      const basic = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugOrFallback(form.title, mode.slice(0, -1)),
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
          const {
            languageId: _languageId,
            ...updatePayload
          } = input;

          void _languageId;

          await updateCourse(editingId, updatePayload);
        } else {
          const created = await createCourse(input);

          try {
            await setCourseApps(created.id, [selectedApp.id]);
          } catch (err) {
            setNotice(
              `Course created, but linking to ${selectedApp.name} failed: ${errorText(err)}`
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

      const savedTitle = basic.title;
      await reload();
      toast.success(
        editingId
          ? `"${savedTitle}" updated.`
          : keepOpen
            ? `"${savedTitle}" created. Add the next one.`
            : `"${savedTitle}" created${mode === "lessons" ? ". Click Content to add the lesson text." : "."}`,
      );

      if (keepOpen) {
        // Keep status and minutes, clear the rest, move to the next order number.
        setForm((current) => ({
          ...initialForm,
          status: current.status,
          sortOrder: current.sortOrder + 1,
          estimatedMinutes: current.estimatedMinutes,
        }));
        setSlugTouched(false);
        setFormErrors({});
        window.setTimeout(() => document.getElementById("hierarchy-title")?.focus(), 0);
      } else {
        setFormOpen(false);
      }
    } catch (err) {
      const fields = apiFieldErrors(err) as FormErrors;
      if (Object.keys(fields).length) setFormErrors(fields);
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item: RecordItem, permanent: boolean) {
    if (mode === "courses") await deleteCourse(item.id, permanent);
    else if (mode === "modules") await deleteModule(item.id, permanent);
    else await deleteLesson(item.id, permanent);
  }

  async function editTranslations(lesson: Lesson) {
    setError("");

    try {
      const detail = await getLesson(lesson.id);
      const existing = (detail.translations ?? []).map((t) => ({
        languageId: t.languageId,
        content: t.content ?? "",
      }));
      // Prefer the app's own language, then the first saved translation.
      const preferred =
        existing.find((t) => t.languageId === selectedApp?.languageId) ??
        existing[0];

      setLessonTranslations(existing);
      setTranslationTitle(lesson.title);
      setTranslationLessonId(lesson.id);
      setTranslationLanguageId(
        preferred?.languageId ?? selectedApp?.languageId ?? "",
      );
      setTranslationContent(preferred?.content ?? "");
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function saveTranslation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!translationLessonId || !translationLanguageId || savingTranslation) return;
    if (!translationContent.trim()) {
      setError("Lesson content cannot be empty.");
      return;
    }

    setSavingTranslation(true);
    setError("");

    try {
      await saveLessonTranslation(translationLessonId, {
        languageId: translationLanguageId,
        content: translationContent,
        format: "MARKDOWN",
      });

      toast.success(`Content for "${translationTitle}" saved.`);
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

                      <DeleteActions
                        itemName={item.title}
                        entity={title.slice(0, -1).toLowerCase()}
                        canArchive={canArchive}
                        hideArchive={item.status === "ARCHIVED"}
                        archiveHelp="Status becomes ARCHIVED and it is hidden from learners. Learners keep their progress. You can publish it again later."
                        permanentHelp={
                          mode === "courses"
                            ? "All modules, lessons, lesson content and learner progress inside this course are removed too."
                            : mode === "modules"
                              ? "All lessons in this module, their content and learner progress are removed too."
                              : "Lesson content, resources and learner progress for this lesson are removed too."
                        }
                        onDelete={(permanent) => removeItem(item, permanent)}
                        onDone={() => void reload()}
                      />
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

            <form onSubmit={(e) => void save(e)} noValidate className="space-y-4">
              {mode !== "courses" && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Adding to{" "}
                  <strong>
                    {mode === "modules"
                      ? courses.find((c) => c.id === courseId)?.title
                      : modules.find((m) => m.id === moduleId)?.title}
                  </strong>
                </p>
              )}

              <FormField label="Title" required error={formErrors.title}>
                {(props) => (
                  <input
                    {...props}
                    id="hierarchy-title"
                    autoFocus
                    value={form.title}
                    maxLength={200}
                    placeholder={mode === "lessons" ? "e.g. Greetings and introductions" : "e.g. Beginner Japanese"}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((f) => ({
                        ...f,
                        title: value,
                        slug: slugTouched ? f.slug : slugify(value),
                      }));
                      if (formErrors.title) setFormErrors((x) => ({ ...x, title: undefined }));
                    }}
                  />
                )}
              </FormField>

              {mode !== "lessons" && (
                <FormField label="Description" hint="Optional. One or two sentences learners will see.">
                  {(props) => (
                    <textarea
                      {...props}
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                  )}
                </FormField>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Status"
                  hint={form.status === "PUBLISHED" ? "Learners can see it." : "Hidden from learners."}
                >
                  {(props) => (
                    <select
                      {...props}
                      value={form.status}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          status: e.target.value as PublicationStatus,
                        }))
                      }
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  )}
                </FormField>

                {mode === "lessons" ? (
                  <FormField label="Minutes" hint="Optional" error={formErrors.estimatedMinutes}>
                    {(props) => (
                      <input
                        {...props}
                        type="number"
                        min="1"
                        max="600"
                        inputMode="numeric"
                        placeholder="e.g. 10"
                        value={form.estimatedMinutes}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, estimatedMinutes: e.target.value }))
                        }
                      />
                    )}
                  </FormField>
                ) : (
                  <div />
                )}
              </div>

              <details
                open={showAdvanced}
                onToggle={(e) => setShowAdvanced((e.currentTarget as HTMLDetailsElement).open)}
                className="rounded-lg border border-slate-200 px-3 py-2"
              >
                <summary className="cursor-pointer text-sm font-semibold text-slate-600">
                  Advanced: URL slug{" "}
                  {form.slug ? <span className="font-mono font-normal text-slate-400">({form.slug})</span> : null}
                  {" "}· order {form.sortOrder}
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <FormField
                    label="Slug"
                    hint="Made from the title automatically."
                    error={formErrors.slug}
                  >
                    {(props) => (
                      <input
                        {...props}
                        value={form.slug}
                        placeholder="auto"
                        onChange={(e) => {
                          setSlugTouched(true);
                          setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }));
                        }}
                      />
                    )}
                  </FormField>
                  <FormField label="Order" hint="Lower shows first." error={formErrors.sortOrder}>
                    {(props) => (
                      <input
                        {...props}
                        type="number"
                        min="0"
                        value={form.sortOrder}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                        }
                      />
                    )}
                  </FormField>
                </div>
              </details>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                {!editingId ? (
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={addAnother}
                      onChange={(e) => setAddAnother(e.target.checked)}
                    />
                    Add another after saving
                  </label>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
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
                    {saving ? "Saving..." : editingId ? "Save changes" : `Create ${title.slice(0, -1).toLowerCase()}`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {translationLessonId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">
              Lesson content
            </h2>
            <p className="-mt-3 mb-4 text-sm text-slate-500">{translationTitle}</p>

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
                    const languageId = e.target.value;
                    setTranslationLanguageId(languageId);
                    // Load what is already saved for this language instead of
                    // an empty box (saving empty would overwrite it).
                    setTranslationContent(
                      lessonTranslations.find((t) => t.languageId === languageId)?.content ?? "",
                    );
                  }}
                  className="w-full rounded-lg border p-2.5"
                >
                  <option value="">Choose language</option>
                  {languages.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.name}
                      {lessonTranslations.some((t) => t.languageId === language.id) ? " (saved)" : ""}
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
