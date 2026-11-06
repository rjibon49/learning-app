'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getCourses, createCourse, deleteCourse, type Course } from '@/lib/api/courses';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminCoursesPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadCourses = useCallback(async () => {
    if (!selectedApp) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCourses(selectedApp.id);
      setCourses(data.filter((c) => c.appId === selectedApp.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, [selectedApp]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setSubmitting(true);
    try {
      await createCourse({
        appId: selectedApp.id,
        title: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        description: description.trim() || undefined,
        sortOrder: courses.length + 1,
        status: 'PUBLISHED',
      });
      setTitle('');
      setSlug('');
      setDescription('');
      await loadCourses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create course.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course? All modules and lessons inside will be lost!')) return;
    try {
      await deleteCourse(id);
      setCourses(courses.filter(c => c.id !== id));
    } catch (err) {
      alert('Failed to delete course');
    }
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading German level..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Courses — {selectedApp.name} ({selectedApp.level})</h1>
        <p className="text-sm text-slate-500">Manage structured learning courses strictly isolated to `{selectedApp.name}`.</p>
      </div>

      <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Add Course to {selectedApp.level}</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Course Title *</label>
            <input required type="text" value={title} onChange={(e) => {
              setTitle(e.target.value);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
            }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Slug *</label>
            <input required type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <LoadingState label="Loading courses..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCourses} />
      ) : courses.length === 0 ? (
        <EmptyState title="No courses yet" description={`Create the first course for ${selectedApp.name}.`} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 text-center">Modules</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{course.sortOrder}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{course.title}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                      {course._count?.modules || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${course.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                      {course.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(course.id)} className="text-rose-600 hover:text-rose-900"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}