'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, Edit2, Plus, FileText } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getCourses, getModules, getLessons, createLesson, updateLesson, deleteLesson, type Course, type CourseModule, type Lesson } from '@/lib/api/courses';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminLessonsPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({ title: '', slug: '', germanText: '', status: 'PUBLISHED' });

  useEffect(() => {
    if (!selectedApp) return;
    getCourses(selectedApp.id).then(res => {
      const appCourses = res.filter(c => c.appId === selectedApp.id);
      setCourses(appCourses);
      if (appCourses.length > 0 && !selectedCourseId) setSelectedCourseId(appCourses[0].id);
    });
  }, [selectedApp, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId) return;
    getModules(selectedCourseId).then(res => {
      setModules(res);
      if (res.length > 0) {
        setSelectedModuleId(res[0].id);
      } else {
        setSelectedModuleId('');
      }
    });
  }, [selectedCourseId]);

  const loadLessons = useCallback(async () => {
    if (!selectedModuleId) {
      setLessons([]);
      return;
    }
    const res = await getLessons(selectedModuleId);
    setLessons(res);
  }, [selectedModuleId]);

  useEffect(() => { void loadLessons(); }, [loadLessons]);

  const openModal = (lesson?: Lesson) => {
    if (lesson) {
      setEditingId(lesson.id);
      setFormData({ title: lesson.title, slug: lesson.slug, germanText: lesson.germanText || '', status: lesson.status || 'DRAFT' });
    } else {
      setEditingId(null);
      setFormData({ title: '', slug: '', germanText: '', status: 'PUBLISHED' });
    }
    setIsModalOpen(true);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId) return;
    setSubmitting(true);
    try {
      const payload = {
        moduleId: selectedModuleId,
        title: formData.title.trim(),
        slug: formData.slug.trim() || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        germanText: formData.germanText.trim() || undefined,
        status: formData.status as any,
        sortOrder: editingId ? undefined : lessons.length + 1,
      };

      if (editingId) {
        await updateLesson(editingId, payload);
      } else {
        await createLesson(payload);
      }
      setIsModalOpen(false);
      await loadLessons();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save lesson.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    await deleteLesson(id);
    setLessons(lessons.filter(l => l.id !== id));
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading..." />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-indigo-600" /> Lessons — {selectedApp.name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Add reading materials and content to modules.</p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex-1">
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Select Course</label>
          <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm bg-slate-50 font-medium focus:border-indigo-500 focus:outline-none">
            {courses.length === 0 ? <option value="">No courses available</option> : courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Select Module</label>
          <select value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)} disabled={modules.length === 0} className="w-full rounded-md border border-slate-300 p-2.5 text-sm bg-slate-50 font-medium focus:border-indigo-500 focus:outline-none disabled:opacity-50">
            {modules.length === 0 ? <option value="">No modules available</option> : modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={() => openModal()} disabled={!selectedModuleId} className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Add Lesson
          </button>
        </div>
      </div>

      {!selectedModuleId ? (
        <div className="text-center py-10 text-slate-500 text-sm">Please select a course and module first.</div>
      ) : lessons.length === 0 ? (
        <EmptyState title="No lessons found" description="Create the first lesson for this module." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Lesson Title</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lessons.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-500">#{l.sortOrder}</td>
                  <td className="px-6 py-4 font-bold text-slate-900 text-base">{l.title}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openModal(l)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors mr-1" title="Edit Lesson">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(l.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Delete Lesson">
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
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Lesson' : 'Create New Lesson'}</h2>
            </div>
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Lesson Title *</label>
                  <input required type="text" value={formData.title} onChange={e => {
                    setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') });
                  }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Slug *</label>
                  <input required type="text" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Lesson Content (German / English)</label>
                <textarea rows={6} value={formData.germanText} onChange={e => setFormData({ ...formData, germanText: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none" placeholder="Write lesson contents here..." />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50">
                  {submitting ? 'Saving...' : editingId ? 'Update Lesson' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}