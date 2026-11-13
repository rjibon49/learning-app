
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth/auth-context";
import { useAppLevel } from "@/lib/auth/app-level-context";
import { Pagination } from "@/components/ui/pagination";

import {
  getCourses,
  getModules,
  getLessons,
  type Course,
  type CourseModule,
  type Lesson,
} from "@/lib/api/courses";

import {
  getQuizzesPage,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  type Quiz,
  type Difficulty,
  type PublicationStatus,
  type PaginationMeta,
} from "@/lib/api/quizzes";

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

type QuizForm = {
  title: string;
  description: string;
  difficulty: Difficulty;
  passingScore: number;
  timeLimitSeconds: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
};

function blankForm(): QuizForm {
  return {
    title: "",
    description: "",
    difficulty: "EASY",
    passingScore: 70,
    timeLimitSeconds: "",
    courseId: "",
    moduleId: "",
    lessonId: "",
  };
}

function errorText(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Request failed.";
}

export default function QuizzesPage() {
  const { admin } = useAuth();
  const { selectedApp } = useAppLevel();

  const canEdit = Boolean(admin);
  const canArchive =
    admin?.role === "SUPER_ADMIN" ||
    admin?.role === "ADMIN";

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [pagination, setPagination] =
    useState<PaginationMeta>(EMPTY_PAGINATION);

  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<PublicationStatus | "">("");

  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [form, setForm] = useState<QuizForm>(blankForm);

  const [linkedLessonLabel, setLinkedLessonLabel] =
    useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!selectedApp) {
      setQuizzes([]);
      setPagination(EMPTY_PAGINATION);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getQuizzesPage({
        appId: selectedApp.id,
        page,
        limit,
        search: search.trim() || undefined,
        status: status || undefined,
      });

      setQuizzes(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [selectedApp, page, limit, search, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let active = true;

    if (!selectedApp) return;

    void getCourses(selectedApp.id)
      .then((result) => {
        if (active) setCourses(result);
      })
      .catch((err) => {
        if (active) setError(errorText(err));
      });

    return () => {
      active = false;
    };
  }, [selectedApp]);

  async function loadCourseOptions() {
    if (!selectedApp) return;

    setLoadingCourses(true);

    try {
      setCourses(await getCourses(selectedApp.id));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoadingCourses(false);
    }
  }

  async function selectCourse(courseId: string) {
    setForm((old) => ({
      ...old,
      courseId,
      moduleId: "",
      lessonId: "",
    }));

    setModules([]);
    setLessons([]);
    setLinkedLessonLabel("");

    if (!courseId) return;

    setLoadingModules(true);
    try {
      setModules(await getModules(courseId));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoadingModules(false);
    }
  }

  async function selectModule(moduleId: string) {
    setForm((old) => ({
      ...old,
      moduleId,
      lessonId: "",
    }));

    setLessons([]);
    setLinkedLessonLabel("");

    if (!moduleId) return;

    setLoadingLessons(true);
    try {
      setLessons(await getLessons(moduleId));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoadingLessons(false);
    }
  }

  function beginCreate() {
    setEditing(null);
    setForm(blankForm());
    setModules([]);
    setLessons([]);
    setLinkedLessonLabel("");
    setShowEditor(true);
    setError("");
    void loadCourseOptions();
  }

  async function beginEdit(quiz: Quiz) {
    setEditing(quiz);
    setForm({
      title: quiz.title,
      description: quiz.description ?? "",
      difficulty: quiz.difficulty,
      passingScore: quiz.passingScore ?? 70,
      timeLimitSeconds:
        quiz.timeLimitSeconds?.toString() ?? "",
      courseId: "",
      moduleId: "",
      lessonId: quiz.lessonId ?? "",
    });

    setModules([]);
    setLessons([]);
    setLinkedLessonLabel(quiz.lesson?.title ?? "");
    setShowEditor(true);
    setError("");

    if (!quiz.lessonId || !selectedApp) return;

    // Restore the Course and Module selectors when
    // editing an already linked quiz.
    setLinkLoading(true);

    try {
      const courseList = await getCourses(selectedApp.id);
      setCourses(courseList);

      let matchCourse = "";
      let matchModule = "";
      let matchLesson: Lesson | undefined;
      let matchModules: CourseModule[] = [];
      let matchLessons: Lesson[] = [];

      for (const course of courseList) {
        const moduleList = await getModules(course.id);

        for (const module of moduleList) {
          const lessonList = await getLessons(module.id);
          const found = lessonList.find(
            (lesson) => lesson.id === quiz.lessonId,
          );

          if (found) {
            matchCourse = course.id;
            matchModule = module.id;
            matchLesson = found;
            matchModules = moduleList;
            matchLessons = lessonList;
            break;
          }
        }

        if (matchLesson) break;
      }

      if (matchLesson) {
        setModules(matchModules);
        setLessons(matchLessons);
        setLinkedLessonLabel(matchLesson.title);

        setForm((old) => ({
          ...old,
          courseId: matchCourse,
          moduleId: matchModule,
          lessonId: matchLesson.id,
        }));
      }
      // If the course hierarchy is unavailable,
      // keep the existing lessonId without deleting it.
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLinkLoading(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedApp || !canEdit) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const title = form.title.trim();
      if (title.length < 2) {
        throw new Error("Quiz title must contain at least two characters.");
      }

      const seconds = form.timeLimitSeconds.trim()
        ? Number(form.timeLimitSeconds)
        : null;

      if (
        seconds !== null &&
        (!Number.isInteger(seconds) ||
          seconds < 10 ||
          seconds > 86400)
      ) {
        throw new Error(
          "Time limit must be between 10 and 86400 seconds.",
        );
      }

      const payload = {
        title,
        description: form.description.trim() || null,
        difficulty: form.difficulty,
        passingScore: form.passingScore,
        timeLimitSeconds: seconds,
        lessonId: form.lessonId || null,
      };

      if (editing) {
        await updateQuiz(editing.id, payload);
      } else {
        await createQuiz({
          ...payload,
          appId: selectedApp.id,
          status: "DRAFT",
        });
      }

      setShowEditor(false);
      setMessage("Quiz saved successfully.");
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    quiz: Quiz,
    next: PublicationStatus,
  ) {
    if (!canEdit) return;

    setError("");
    setMessage("");

    try {
      if (next === "ARCHIVED") {
        if (!canArchive) return;
        if (!window.confirm(`Archive "${quiz.title}"?`)) return;
        await deleteQuiz(quiz.id);
      } else {
        await updateQuiz(quiz.id, { status: next });
      }

      setMessage(`Quiz status changed to ${next}.`);
      await reload();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Global Quiz Builder
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {selectedApp?.name ?? "Select an application"}
          </p>
        </div>

        {canEdit && selectedApp && (
          <button
            type="button"
            onClick={beginCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            + Create Quiz
          </button>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <section className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
        <input
          aria-label="Search quizzes"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search quizzes..."
          className="rounded-lg border p-2.5 text-sm"
        />

        <select
          aria-label="Filter quiz status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as PublicationStatus | "");
            setPage(1);
          }}
          className="rounded-lg border p-2.5 text-sm"
        >
          <option value="">All Statuses</option>
          {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map(
            (value) => (
              <option key={value} value={value}>{value}</option>
            ),
          )}
        </select>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Quiz</th>
                <th className="px-4 py-3">Lesson</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Questions</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {quizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{quiz.title}</p>
                    <p className="text-xs text-slate-500">
                      Pass: {quiz.passingScore ?? 70}%
                    </p>
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {quiz.lesson?.title ??
                      (quiz.lessonId ? "Linked lesson" : "Standalone")}
                  </td>

                  <td className="px-4 py-3">
                    {quiz.difficulty}
                  </td>

                  <td className="px-4 py-3">
                    {quiz._count?.questions ?? 0}
                  </td>

                  <td className="px-4 py-3">
                    {quiz.status}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/admin/quizzes/${quiz.id}`}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                      >
                        Questions
                      </Link>

                      {canEdit && quiz.status !== "ARCHIVED" && (
                        <>
                          <button
                            type="button"
                            onClick={() => void beginEdit(quiz)}
                            className="rounded-lg border px-3 py-1.5 text-xs"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void changeStatus(
                                quiz,
                                quiz.status === "PUBLISHED"
                                  ? "DRAFT"
                                  : "PUBLISHED",
                              )
                            }
                            className="rounded-lg border px-3 py-1.5 text-xs"
                          >
                            {quiz.status === "PUBLISHED"
                              ? "Unpublish"
                              : "Publish"}
                          </button>

                          {canArchive && (
                            <button
                              type="button"
                              onClick={() =>
                                void changeStatus(quiz, "ARCHIVED")
                              }
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600"
                            >
                              Archive
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && quizzes.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-slate-500"
                  >
                    No quizzes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <p className="p-4 text-sm text-slate-500">
            Loading quizzes...
          </p>
        )}

        <div className="p-4">
          <Pagination
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPage(1);
              setLimit(size);
            }}
            isLoading={loading}
          />
        </div>
      </section>

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form
            onSubmit={(event) => void save(event)}
            className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-6"
          >
            <h2 className="text-lg font-bold">
              {editing ? "Edit Quiz" : "Create Quiz"}
            </h2>

            <label className="block space-y-1 text-sm">
              <span>Title</span>
              <input
                required
                minLength={2}
                maxLength={200}
                value={form.title}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    description: event.target.value,
                  }))
                }
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>Difficulty</span>
                <select
                  value={form.difficulty}
                  onChange={(event) =>
                    setForm((old) => ({
                      ...old,
                      difficulty: event.target.value as Difficulty,
                    }))
                  }
                  className="w-full rounded-lg border p-2.5"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span>Passing Score (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.passingScore}
                  onChange={(event) =>
                    setForm((old) => ({
                      ...old,
                      passingScore: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-lg border p-2.5"
                />
              </label>
            </div>

            <label className="block space-y-1 text-sm">
              <span>Time Limit (seconds, optional)</span>
              <input
                type="number"
                min={10}
                max={86400}
                value={form.timeLimitSeconds}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    timeLimitSeconds: event.target.value,
                  }))
                }
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <section className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div>
                <h3 className="text-sm font-bold">
                  Link to Lesson (Optional)
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Choose Course → Module → Lesson. You can also
                  create a standalone quiz without a lesson.
                </p>
              </div>

              {form.lessonId && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-white p-3 text-sm">
                  <span>
                    Linked:{" "}
                    {lessons.find(
                      (lesson) => lesson.id === form.lessonId,
                    )?.title ||
                      linkedLessonLabel ||
                      "Existing lesson"}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((old) => ({
                        ...old,
                        lessonId: "",
                      }));
                      setLinkedLessonLabel("");
                    }}
                    className="font-semibold text-red-600"
                  >
                    Unlink
                  </button>
                </div>
              )}

              {linkLoading && (
                <p className="text-xs text-slate-500">
                  Resolving linked lesson...
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-xs">
                  <span>Course</span>
                  <select
                    value={form.courseId}
                    disabled={loadingCourses || linkLoading}
                    onChange={(event) =>
                      void selectCourse(event.target.value)
                    }
                    className="w-full rounded-lg border bg-white p-2.5"
                  >
                    <option value="">Select Course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs">
                  <span>Module</span>
                  <select
                    value={form.moduleId}
                    disabled={!form.courseId || loadingModules || linkLoading}
                    onChange={(event) =>
                      void selectModule(event.target.value)
                    }
                    className="w-full rounded-lg border bg-white p-2.5"
                  >
                    <option value="">Select Module</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs">
                  <span>Lesson</span>
                  <select
                    value={lessons.some(
                      (lesson) => lesson.id === form.lessonId,
                    ) ? form.lessonId : ""}
                    disabled={!form.moduleId || loadingLessons || linkLoading}
                    onChange={(event) => {
                      const id = event.target.value;
                      const match = lessons.find(
                        (lesson) => lesson.id === id,
                      );

                      setForm((old) => ({
                        ...old,
                        lessonId: id,
                      }));

                      setLinkedLessonLabel(match?.title ?? "");
                    }}
                    className="w-full rounded-lg border bg-white p-2.5"
                  >
                    <option value="">Select Lesson</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {form.lessonId && (
                <p className="text-xs text-emerald-700">
                  This quiz will be linked to the selected lesson.
                </p>
              )}
            </section>

            <p className="text-xs text-slate-500">
              New quizzes start as Draft. Add questions before publishing.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || linkLoading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Quiz"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
