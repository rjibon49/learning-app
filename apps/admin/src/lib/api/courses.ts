
import { apiRequest } from "@/lib/api/client";

export type PublicationStatus =
  | "DRAFT"
  | "REVIEW"
  | "PUBLISHED"
  | "ARCHIVED";

export type PaginationData = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paged<T> = {
  data: T[];
  pagination: PaginationData;
};

export interface Course {
  id: string;
  languageId: string;
  levelId: string | null;
  title: string;
  slug: string;
  description?: string | null;
  status: PublicationStatus;
  sortOrder: number;
  apps?: Array<{
    appId?: string;
    app?: { id: string; name: string };
  }>;
  _count?: { modules?: number; apps?: number };
  createdAt?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description?: string | null;
  status: PublicationStatus;
  sortOrder: number;
  _count?: { lessons?: number };
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  status: PublicationStatus;
  sortOrder: number;
  estimatedMinutes?: number | null;
  translations?: LessonTranslation[];
  resources?: LessonResource[];
  _count?: { translations?: number; resources?: number };
}

export interface LessonTranslation {
  id?: string;
  lessonId?: string;
  languageId: string;
  content: string;
  format: string;
}

export interface LessonResource {
  id: string;
  assetId?: string | null;
  type: string;
  title: string;
  sortOrder: number;
}

export interface CourseInput {
  languageId: string;
  levelId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  status?: PublicationStatus;
  sortOrder?: number;
}

export interface ModuleInput {
  courseId: string;
  title: string;
  slug: string;
  description?: string | null;
  status?: PublicationStatus;
  sortOrder?: number;
}

export interface LessonInput {
  moduleId: string;
  title: string;
  slug: string;
  estimatedMinutes?: number | null;
  status?: PublicationStatus;
  sortOrder?: number;
}

type ListResponse<T> =
  | T[]
  | { data: T[]; pagination?: Partial<PaginationData> };

function asPaged<T>(
  result: ListResponse<T>,
  page: number,
  limit: number,
): Paged<T> {
  if (Array.isArray(result)) {
    return {
      data: result,
      pagination: {
        page,
        limit,
        total: result.length,
        totalPages: Math.max(1, Math.ceil(result.length / limit)),
      },
    };
  }

  const total = result.pagination?.total ?? result.data.length;

  return {
    data: result.data,
    pagination: {
      page: result.pagination?.page ?? page,
      limit: result.pagination?.limit ?? limit,
      total,
      totalPages:
        result.pagination?.totalPages ??
        Math.max(1, Math.ceil(total / limit)),
    },
  };
}

function queryString(
  values: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

function pathId(id: string): string {
  return encodeURIComponent(id);
}

// ==========================================
// COURSES
// ==========================================

export async function getCoursesPage(
  options: {
    appId?: string;
    languageId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<Paged<Course>> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  const qs = queryString({
    appId: options.appId,
    languageId: options.languageId,
    search: options.search,
    page,
    limit,
  });

  const result = await apiRequest<ListResponse<Course>>(
    `/admin/courses?${qs}`,
  );

  return asPaged(result, page, limit);
}

export async function getCourses(
  appId?: string,
): Promise<Course[]> {
  const collected: Course[] = [];

  for (let page = 1; page <= 50; page++) {
    const result = await getCoursesPage({
      appId,
      page,
      limit: 100,
    });

    collected.push(...result.data);

    if (
      result.data.length === 0 ||
      page >= result.pagination.totalPages
    ) {
      break;
    }
  }

  return collected;
}

export function getCourse(id: string) {
  return apiRequest<Course>(`/admin/courses/${pathId(id)}`);
}

export function createCourse(input: CourseInput) {
  return apiRequest<Course>("/admin/courses", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCourse(
  id: string,
  input: Partial<CourseInput>,
) {
  return apiRequest<Course>(`/admin/courses/${pathId(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCourse(id: string) {
  return apiRequest<void>(`/admin/courses/${pathId(id)}`, {
    method: "DELETE",
  });
}

export function setCourseApps(
  courseId: string,
  appIds: string[],
) {
  return apiRequest(
    `/admin/courses/${pathId(courseId)}/apps`,
    {
      method: "POST",
      body: JSON.stringify({ appIds }),
    },
  );
}

// ==========================================
// MODULES
// ==========================================

export async function getModules(
  courseId?: string,
): Promise<CourseModule[]> {
  if (!courseId) return [];

  const result = await apiRequest<ListResponse<CourseModule>>(
    `/admin/courses/modules?${queryString({ courseId })}`,
  );

  return Array.isArray(result) ? result : result.data;
}

export function createModule(input: ModuleInput) {
  return apiRequest<CourseModule>("/admin/courses/modules", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateModule(
  id: string,
  input: Partial<ModuleInput>,
) {
  return apiRequest<CourseModule>(
    `/admin/courses/modules/${pathId(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function deleteModule(id: string) {
  return apiRequest<void>(
    `/admin/courses/modules/${pathId(id)}`,
    { method: "DELETE" },
  );
}

// ==========================================
// LESSONS
// ==========================================

export async function getLessons(
  moduleId?: string,
): Promise<Lesson[]> {
  if (!moduleId) return [];

  const result = await apiRequest<ListResponse<Lesson>>(
    `/admin/courses/lessons?${queryString({ moduleId })}`,
  );

  return Array.isArray(result) ? result : result.data;
}

export function getLesson(id: string) {
  return apiRequest<Lesson>(
    `/admin/courses/lessons/${pathId(id)}`,
  );
}

export function createLesson(input: LessonInput) {
  return apiRequest<Lesson>("/admin/courses/lessons", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLesson(
  id: string,
  input: Partial<LessonInput>,
) {
  return apiRequest<Lesson>(
    `/admin/courses/lessons/${pathId(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function deleteLesson(id: string) {
  return apiRequest<void>(
    `/admin/courses/lessons/${pathId(id)}`,
    { method: "DELETE" },
  );
}

// ==========================================
// LESSON TRANSLATIONS
// ==========================================

export function saveLessonTranslation(
  lessonId: string,
  input: {
    languageId: string;
    content: string;
    format: "MARKDOWN";
  },
) {
  return apiRequest(
    `/admin/courses/lessons/${pathId(lessonId)}/translations`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function deleteLessonTranslation(
  lessonId: string,
  languageId: string,
) {
  return apiRequest<void>(
    `/admin/courses/lessons/${pathId(lessonId)}/translations/${pathId(languageId)}`,
    { method: "DELETE" },
  );
}

// ==========================================
// LESSON MEDIA RESOURCES
// ==========================================

export function addLessonResource(
  lessonId: string,
  input: {
    assetId: string;
    type: string;
    title: string;
  },
) {
  return apiRequest(
    `/admin/courses/lessons/${pathId(lessonId)}/resources`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function updateLessonResource(
  lessonId: string,
  resourceId: string,
  input: { title?: string; sortOrder?: number },
) {
  return apiRequest(
    `/admin/courses/lessons/${pathId(lessonId)}/resources/${pathId(resourceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function deleteLessonResource(
  lessonId: string,
  resourceId: string,
) {
  return apiRequest<void>(
    `/admin/courses/lessons/${pathId(lessonId)}/resources/${pathId(resourceId)}`,
    { method: "DELETE" },
  );
}
