import type { Catalog, LearnerApp, Course, CourseModule, Lesson, Vocabulary, VocabularyCategory } from './types';
import {demoApps, demoCourses, demoModules, demoLessons, demoCategories, demoVocabulary} from './demo-data.js';

export const demoCatalog: Catalog = {
  apps: demoApps as LearnerApp[], courses: demoCourses as Course[],
  modules: demoModules as CourseModule[], lessons: demoLessons as Lesson[],
  categories: demoCategories as VocabularyCategory[], words: demoVocabulary as Vocabulary[],
};
async function readRows<T>(path:string):Promise<T[]> {
  const response=await fetch(`/api${path}`,{headers:{Accept:'application/json'},cache:'no-store'});
  if(!response.ok) throw new Error(`Request failed (${response.status}): ${path}`);
  const payload:unknown=await response.json();
  if(!Array.isArray(payload)) throw new Error(`Invalid API data: ${path}`);
  return payload as T[];
}
export async function getPublicCatalog():Promise<Catalog> {
  const apps=await readRows<LearnerApp>('/apps');
  const [courses,modules,lessons,categories,perAppWords]=await Promise.all([
    readRows<Course>('/courses'), readRows<CourseModule>('/courses/modules'),
    readRows<Lesson>('/courses/lessons'), readRows<VocabularyCategory>('/vocabulary/categories'),
    Promise.all(apps.map(app=>readRows<Vocabulary>(`/vocabulary?appId=${encodeURIComponent(app.id)}`))),
  ]);
  return { apps,courses,modules,lessons,categories,words:perAppWords.flat() };
}
