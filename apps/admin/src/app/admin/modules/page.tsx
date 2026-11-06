'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getCourses, getModules, createModule, deleteModule, type Course, type CourseModule } from '@/lib/api/courses';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminModulesPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!selectedApp) return;
    setLoading(true);
    try {
      const fetchedCourses = await getCourses(selectedApp.id);
      const appCourses = fetchedCourses.filter((c) => c.appId === selectedApp.id);
      setCourses(appCourses);

      if (appCourses.length > 0) {
        const defaultCourseId = selectedCourseId || appCourses[0].id;
        if (!selectedCourseId) setSelectedCourseId(defaultCourseId);
        
        const fetchedModules = await getModules(defaultCourseId);
        setModules(fetchedModules.filter(m => m.courseId === defaultCourseId));
      } else {
        setModules([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [selectedApp, selectedCourseId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    setSubmitting(true);
    try {
      await createModule({
        courseId: selectedCourseId,
        title: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        sortOrder: modules.length + 1,
        status: 'PUBLISHED',
      });
      setTitle('');
      setSlug('');
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create module.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this module and all its lessons?')) return;
    try {
      await deleteModule(id);
      setModules(modules.filter(m => m.id !== id));
    } catch (err) {
      alert('Failed to delete module');
    }
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading German level..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Modules — {selectedApp.name}</h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Select Course</h2>
        <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none">
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {selectedCourseId && (
        <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Module Title *</label>
              <input required type="text" value={title} onChange={(e) => { setTitle(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')); }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Slug *</label>
              <input required type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={submitting} className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Create Module</button>
            </div>
          </div>
        </form>
      )}

      {loading ? <LoadingState label="Loading modules..." /> : modules.length === 0 ? <EmptyState title="No modules" description="Create the first module." /> : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 text-center">Lessons</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {modules.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{m.sortOrder}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{m.title}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                      {m._count?.lessons || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(m.id)} className="text-rose-600 hover:text-rose-900"><Trash2 className="h-4 w-4 inline" /></button>
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