import { getCurrentApp, type LearningApp } from "../api/app";
import { fetchAppCourses, fetchCourse, type CourseLesson } from "../api/courses";
import { getCompletedLessons } from "./lesson-progress";

export type LessonStatus = "done" | "current" | "open" | "locked";

export type PathLesson = CourseLesson & {
  number: number;
  status: LessonStatus;
  moduleTitle: string;
  courseTitle: string;
};

export type PathModule = {
  id: string;
  title: string;
  description: string | null;
  courseTitle: string;
  lessons: PathLesson[];
  done: number;
  locked: boolean;
};

export type LearningPath = {
  app: LearningApp;
  modules: PathModule[];
  next: PathLesson | null;
  totalLessons: number;
  doneLessons: number;
};

/**
 * Courses → modules → lessons in CMS order, with this learner's status.
 * A module opens when the one before it is finished, so beginners follow
 * the A1 order; every lesson inside an open module can be read.
 */
export async function loadLearningPath(userId: string): Promise<LearningPath> {
  const app = await getCurrentApp();
  const [courses, completed] = await Promise.all([fetchAppCourses(app.id), getCompletedLessons(userId)]);
  const details = await Promise.all(courses.map((c) => fetchCourse(c.id)));

  const modules: PathModule[] = [];
  let previousModuleDone = true;
  let next: PathLesson | null = null;
  let totalLessons = 0;
  let doneLessons = 0;

  for (const course of details) {
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
          courseTitle: course.title,
        };
        if (status === "current") next = item;
        return item;
      });

      modules.push({
        id: mod.id,
        title: mod.title,
        description: mod.description,
        courseTitle: course.title,
        lessons: pathLessons,
        done,
        locked,
      });

      totalLessons += lessons.length;
      doneLessons += done;
      previousModuleDone = previousModuleDone && done === lessons.length;
    }
  }

  return { app, modules, next, totalLessons, doneLessons };
}
