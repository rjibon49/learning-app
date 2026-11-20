import { getCurrentApp, type LearningApp } from "../api/app";
import { fetchAppCourses, fetchCourse, type CourseLesson } from "../api/courses";
import { getCompletedLessons } from "./lesson-progress";

export type LessonStatus = "done" | "current" | "open" | "locked";

export type PathLesson = CourseLesson & {
  number: number;
  status: LessonStatus;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
};

export type PathModule = {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  courseTitle: string;
  lessons: PathLesson[];
  done: number;
  locked: boolean;
};

export type PathCourse = {
  id: string;
  title: string;
  description: string | null;
  modules: PathModule[];
  /** The first lesson of this course that is not done yet. */
  next: PathLesson | null;
  totalLessons: number;
  doneLessons: number;
};

export type LearningPath = {
  app: LearningApp;
  courses: PathCourse[];
  /** Every module of every course, in order. */
  modules: PathModule[];
  /** Where to go on: the course the learner worked in last, else the first open course. */
  next: PathLesson | null;
  totalLessons: number;
  doneLessons: number;
};

/**
 * Courses → modules → lessons in CMS order, with this learner's status.
 * Every course can be started at any time. Inside a course a module opens
 * when the one before it is finished, so learners keep the A1 order; every
 * lesson inside an open module can be read.
 */
export async function loadLearningPath(userId: string): Promise<LearningPath> {
  const app = await getCurrentApp();
  const [courses, completed] = await Promise.all([fetchAppCourses(app.id), getCompletedLessons(userId)]);
  const details = await Promise.all(courses.map((c) => fetchCourse(c.id)));

  const pathCourses: PathCourse[] = [];

  for (const course of details) {
    const modules: PathModule[] = [];
    let previousModuleDone = true;
    let next: PathLesson | null = null;
    let total = 0;
    let doneCount = 0;

    for (const mod of [...course.modules].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const lessons = [...mod.lessons].sort((a, b) => a.sortOrder - b.sortOrder);
      const locked = !previousModuleDone;
      const done = lessons.filter((l) => completed.has(l.id)).length;

      const pathLessons: PathLesson[] = lessons.map((lesson, index) => {
        let status: LessonStatus = locked ? "locked" : completed.has(lesson.id) ? "done" : "open";
        if (status === "open" && !next) status = "current";
        const item: PathLesson = {
          ...lesson,
          number: index + 1,
          status,
          moduleTitle: mod.title,
          courseId: course.id,
          courseTitle: course.title,
        };
        if (status === "current") next = item;
        return item;
      });

      modules.push({
        id: mod.id,
        title: mod.title,
        description: mod.description,
        courseId: course.id,
        courseTitle: course.title,
        lessons: pathLessons,
        done,
        locked,
      });

      total += lessons.length;
      doneCount += done;
      previousModuleDone = previousModuleDone && done === lessons.length;
    }

    pathCourses.push({
      id: course.id,
      title: course.title,
      description: course.description,
      modules,
      next,
      totalLessons: total,
      doneLessons: doneCount,
    });
  }

  // Continue in a course the learner has started and not finished; else the first unfinished one.
  const started = pathCourses.find((c) => c.doneLessons > 0 && c.next);
  const nextCourse = started ?? pathCourses.find((c) => c.next) ?? null;

  return {
    app,
    courses: pathCourses,
    modules: pathCourses.flatMap((c) => c.modules),
    next: nextCourse?.next ?? null,
    totalLessons: pathCourses.reduce((n, c) => n + c.totalLessons, 0),
    doneLessons: pathCourses.reduce((n, c) => n + c.doneLessons, 0),
  };
}

/** The next unfinished lesson in the same course as `lessonId`. */
export function nextLessonAfter(path: LearningPath, lessonId: string): PathLesson | null {
  const course = path.courses.find((c) => c.modules.some((m) => m.lessons.some((l) => l.id === lessonId)));
  if (!course) return path.next;
  if (course.next && course.next.id !== lessonId) return course.next;
  // This course is finished: suggest the next course that still has lessons.
  return path.courses.find((c) => c.id !== course.id && c.next)?.next ?? null;
}
