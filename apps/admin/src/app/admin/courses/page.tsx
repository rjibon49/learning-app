'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, Edit2, Plus, BookOpen, ArrowLeft } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getCourses, createCourse, updateCourse, deleteCourse, type Course } from '@/lib/api/courses';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminCoursesPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({ title: '', slug: '', description: '', status: 'DRAFT' });

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

  const openModal = (course?: Course) => {
    if (course) {
      setEditingId(course.id);
      setFormData({
        title: course.title,
        slug: course.slug,
        description: course.description || '',
        status: course.status || 'DRAFT',
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', slug: '', description: '', status: 'PUBLISHED' });
    }
    setIsModalOpen(true);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setSubmitting(true);
    try {
      const payload = {
        appId: selectedApp.id,
        title: formData.title.trim(),
        slug: formData.slug.trim() || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        description: formData.description.trim() || undefined,
        status: formData.status as any,
        sortOrder: editingId ? undefined : courses.length + 1,
      };

      if (editingId) {
        await updateCourse(editingId, payload);
      } else {
        await createCourse(payload);
      }
      setIsModalOpen(false);
      await loadCourses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save course.');
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" /> Courses — {selectedApp.name} ({selectedApp.level})
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage structured learning courses strictly isolated to this level.</p>
        </div>
        <button onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> Add Course
        </button>
      </div>

      {loading ? (
        <LoadingState label="Loading courses..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCourses} />
      ) : courses.length === 0 ? (
        <EmptyState title="No courses yet" description={`Create the first course for ${selectedApp.name}.`} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Course Title & Slug</th>
                <th className="px-6 py-4 text-center">Modules</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-500">#{course.sortOrder}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 text-base">{course.title}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">{course.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                      {course._count?.modules || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${course.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {course.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openModal(course)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors mr-1" title="Edit Course">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(course.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Delete Course">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Course' : 'Create New Course'}</h2>
            </div>
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Course Title *</label>
                <input required type="text" value={formData.title} onChange={(e) => {
                  setFormData({
                    ...formData, title: e.target.value, 
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
                  });
                }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Slug *</label>
                <input required type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50">
                  {submitting ? 'Saving...' : editingId ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}