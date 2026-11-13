
"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getCourses,
  getModules,
  getLessons,
  type Course,
  type CourseModule,
  type Lesson,
} from "@/lib/api/courses";

type Props = {
  appId: string;
  value: string;
  currentLessonName?: string | null;
  onChange: (lessonId: string) => void;
};

export function VocabularyLessonPicker({
  appId,
  value,
  currentLessonName,
  onChange,
}: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void getCourses(appId)
      .then((data) => {
        if (active) setCourses(data);
      })
      .catch(() => {
        if (active) setError("Unable to load courses.");
      });

    return () => {
      active = false;
    };
  }, [appId]);

  useEffect(() => {
    if (!courseId) return;

    let active = true;

    void getModules(courseId)
      .then((data) => {
        if (active) setModules(data);
      })
      .catch(() => {
        if (active) setError("Unable to load modules.");
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  useEffect(() => {
    if (!moduleId) return;

    let active = true;

    setLoading(true);

    void getLessons(moduleId)
      .then((data) => {
        if (active) setLessons(data);
      })
      .catch(() => {
        if (active) setError("Unable to load lessons.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [moduleId]);

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold">
        Link to Lesson (optional)
      </p>

      {value && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-indigo-50 p-2 text-xs text-indigo-800">
          <span>
            Selected:{" "}
            {lessons.find((l) => l.id === value)?.title ||
              currentLessonName ||
              "Existing lesson"}
          </span>

          <button
            type="button"
            onClick={() => onChange("")}
            className="font-semibold underline"
          >
            Remove
          </button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <select
          aria-label="Select course"
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setModuleId("");
            setModules([]);
            setLessons([]);
          }}
          className="w-full rounded-lg border bg-white p-2 text-sm"
        >
          <option value="">Choose Course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>

        <select
          aria-label="Select module"
          value={moduleId}
          disabled={!courseId}
          onChange={(e) => {
            setModuleId(e.target.value);
            setLessons([]);
          }}
          className="w-full rounded-lg border bg-white p-2 text-sm disabled:opacity-50"
        >
          <option value="">Choose Module</option>
          {modules.map((module) => (
            <option key={module.id} value={module.id}>
              {module.title}
            </option>
          ))}
        </select>

        <select
          aria-label="Select lesson"
          value={lessons.some((l) => l.id === value) ? value : ""}
          disabled={!moduleId || loading}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border bg-white p-2 text-sm disabled:opacity-50"
        >
          <option value="">
            {loading ? "Loading..." : "Choose Lesson"}
          </option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.title}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-500">
        Select a course and module to see their lessons.
        You do not need to type any IDs.
      </p>
    </div>
  );
}
