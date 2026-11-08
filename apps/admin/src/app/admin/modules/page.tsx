'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, Edit2, Plus, Layers } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getCourses, getModules, createModule, updateModule, deleteModule, type Course, type CourseModule } from '@/lib/api/courses';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminModulesPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({ title: '', slug: '', status: 'PUBLISHED' });

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

  const openModal = (mod?: CourseModule) => {
    if (mod) {
      setEditingId(mod.id);
      setFormData({ title: mod.title, slug: mod.slug, status: mod.status || 'DRAFT' });
    } else {
      setEditingId(null);
      setFormData({ title: '', slug: '', status: 'PUBLISHED' });
    }
    setIsModalOpen(true);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    setSubmitting(true);
    try {
      const payload = {
        courseId: selectedCourseId,
        title: formData.title.trim(),
        slug: formData.slug.trim() || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        status: formData.status as any,
        sortOrder: editingId ? undefined : modules.length + 1,
      };

      if (editingId) {
        await updateModule(editingId, payload);
      } else {
        await createModule(payload);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save module.');
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" /> Modules — {selectedApp.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Organize courses into smaller modules or chapters.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
        <h2 className="text-sm font-bold uppercase text-slate-700">Select Course:</h2>
        <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-slate-50 font-medium">
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        
        {selectedCourseId && (
          <button onClick={() => openModal()} className="ml-auto inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Add Module
          </button>
        )}
      </div>

      {loading ? <LoadingState label="Loading modules..." /> : modules.length === 0 ? <EmptyState title="No modules" description="Create the first module for the selected course." /> : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Module Title & Slug</th>
                <th className="px-6 py-4 text-center">Lessons</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {modules.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-500">#{m.sortOrder}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 text-base">{m.title}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">{m.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                      {m._count?.lessons || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openModal(m)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors mr-1" title="Edit Module">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Delete Module">
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
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Module' : 'Create New Module'}</h2>
            </div>
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Module Title *</label>
                <input required type="text" value={formData.title} onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') });
                }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Slug *</label>
                <input required type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50">
                  {submitting ? 'Saving...' : editingId ? 'Update Module' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}