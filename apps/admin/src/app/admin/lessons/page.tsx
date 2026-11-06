'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getCourses, getModules, getLessons, createLesson, deleteLesson, type Course, type CourseModule, type Lesson } from '@/lib/api/courses';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminLessonsPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [germanText, setGermanText] = useState('');
  const [submitting, setSubmitting] = useState<boolean>(false);

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
      if (res.length > 0) setSelectedModuleId(res[0].id);
    });
  }, [selectedCourseId]);

  const loadLessons = useCallback(async () => {
    if (!selectedModuleId) return;
    const res = await getLessons(selectedModuleId);
    setLessons(res);
  }, [selectedModuleId]);

  useEffect(() => { void loadLessons(); }, [loadLessons]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId) return;
    setSubmitting(true);
    try {
      await createLesson({
        moduleId: selectedModuleId,
        title: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        germanText: germanText.trim() || undefined,
        sortOrder: lessons.length + 1,
        status: 'PUBLISHED',
      });
      setTitle(''); setSlug(''); setGermanText('');
      await loadLessons();
    } catch (err) { alert('Failed to create lesson.'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    await deleteLesson(id);
    setLessons(lessons.filter(l => l.id !== id));
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Lessons — {selectedApp.name}</h1>
      
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-6">
        <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:outline-none">
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:outline-none">
          {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </div>

      {selectedModuleId && (
        <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input required type="text" placeholder="Lesson Title" value={title} onChange={e => { setTitle(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')); }} className="w-full rounded-md border border-slate-300 p-2 text-sm" />
            <input required type="text" placeholder="Slug" value={slug} onChange={e => setSlug(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 text-sm" />
          </div>
          <textarea rows={3} placeholder="German Content..." value={germanText} onChange={e => setGermanText(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 text-sm" />
          <button type="submit" disabled={submitting} className="rounded-md bg-slate-900 px-6 py-2 text-sm font-semibold text-white">Create Lesson</button>
        </form>
      )}

      {lessons.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Title</th><th className="p-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {lessons.map((l) => (
                <tr key={l.id}><td className="p-4 font-semibold text-slate-900">{l.title}</td><td className="p-4 text-right"><button onClick={() => handleDelete(l.id)} className="text-rose-600"><Trash2 className="h-4 w-4 inline" /></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}