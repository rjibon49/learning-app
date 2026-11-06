import { apiRequest } from './client';

export type PublicationStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface Course {
  id: string;
  appId: string;
  title: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  status: PublicationStatus;
  _count?: { modules: number }; // ব্যাকএন্ড থেকে আসা মডিউল কাউন্ট
  modules?: CourseModule[];
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  status: PublicationStatus;
  _count?: { lessons: number }; // ব্যাকএন্ড থেকে আসা লেসন কাউন্ট
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  germanText?: string | null;
  englishText?: string | null;
  banglaText?: string | null;
  estimatedMinutes?: number | null;
  sortOrder: number;
  status: PublicationStatus;
}

// ================= COURSES =================

export async function getCourses(appId?: string): Promise<Course[]> {
  const query = appId ? `?appId=${encodeURIComponent(appId)}` : '';
  const res = await apiRequest<Course[] | { data?: Course[] }>(`/courses${query}`);
  return Array.isArray(res) ? res : res.data ?? [];
}

export async function createCourse(payload: Partial<Course>): Promise<Course> {
  return apiRequest<Course>('/courses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCourse(id: string, payload: Partial<Course>): Promise<Course> {
  return apiRequest<Course>(`/courses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCourse(id: string): Promise<void> {
  return apiRequest<void>(`/courses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ================= MODULES =================

export async function getModules(courseId?: string): Promise<CourseModule[]> {
  const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
  const res = await apiRequest<CourseModule[] | { data?: CourseModule[] }>(`/courses/modules${query}`);
  return Array.isArray(res) ? res : res.data ?? [];
}

export async function createModule(payload: Partial<CourseModule>): Promise<CourseModule> {
  return apiRequest<CourseModule>('/courses/modules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateModule(id: string, payload: Partial<CourseModule>): Promise<CourseModule> {
  return apiRequest<CourseModule>(`/courses/modules/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteModule(id: string): Promise<void> {
  return apiRequest<void>(`/courses/modules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ================= LESSONS =================

export async function getLessons(moduleId?: string): Promise<Lesson[]> {
  const query = moduleId ? `?moduleId=${encodeURIComponent(moduleId)}` : '';
  const res = await apiRequest<Lesson[] | { data?: Lesson[] }>(`/courses/lessons${query}`);
  return Array.isArray(res) ? res : res.data ?? [];
}

export async function createLesson(payload: Partial<Lesson>): Promise<Lesson> {
  return apiRequest<Lesson>('/courses/lessons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLesson(id: string, payload: Partial<Lesson>): Promise<Lesson> {
  return apiRequest<Lesson>(`/courses/lessons/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteLesson(id: string): Promise<void> {
  return apiRequest<void>(`/courses/lessons/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}