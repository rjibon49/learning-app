
import { apiClient } from "./client";

export type CourseLesson = {
  id: string;
  title: string;
  slug: string;
  sortOrder: number;
  estimatedMinutes: number | null;
};

export type CourseModule = {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  lessons: CourseLesson[];
};

export type CourseSummary = {
  id: string;
  languageId: string;
  levelId: string | null;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  language: {
    code: string;
    name: string;
    nativeName: string | null;
  };
  level: {
    code: string;
    name: string;
  } | null;
};

export type CourseDetail = CourseSummary & {
  modules: CourseModule[];
};

export type CourseListResponse = {
  data: CourseSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type LessonTranslation = {
  language: {
    code: string;
    name: string;
  };
  title: string | null;
  content: string;
  format: string;
};

export type LessonResource = {
  id: string;
  title: string;
  type: string;
  sortOrder: number;
  asset: {
    publicUrl: string | null;
    mimeType: string | null;
    fileSize: number | null;
  } | null;
};

export type LessonDetail = CourseLesson & {
  translations: LessonTranslation[];
  resources: LessonResource[];
};

export async function fetchCourses(
  page = 1,
  search = ""
): Promise<CourseListResponse> {
  const response = await apiClient.get<CourseListResponse>(
    "/courses",
    {
      params: {
        language: "de",
        page,
        limit: 20,
        ...(search.trim()
          ? { search: search.trim() }
          : {}),
      },
    }
  );

  return response.data;
}

export async function fetchCourse(
  courseId: string
): Promise<CourseDetail> {
  const response = await apiClient.get<CourseDetail>(
    `/courses/${encodeURIComponent(courseId)}`
  );

  return response.data;
}

export async function fetchLesson(
  lessonId: string
): Promise<LessonDetail> {
  const response = await apiClient.get<LessonDetail>(
    `/courses/lessons/${encodeURIComponent(lessonId)}`
  );

  return response.data;
}
