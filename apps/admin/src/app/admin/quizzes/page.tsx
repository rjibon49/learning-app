'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, Trash2, Edit3, Plus, X, BookOpen } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getQuizzes, createQuiz, updateQuiz, deleteQuiz, type Quiz } from '@/lib/api/quizzes';
import { getCourses, getModules, getLessons, type Course, type CourseModule, type Lesson } from '@/lib/api/courses';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminQuizzesPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Quiz['type']>('MULTIPLE_CHOICE');
  const [difficulty, setDifficulty] = useState<Quiz['difficulty']>('EASY');
  const [status, setStatus] = useState<Quiz['status']>('PUBLISHED');
  const [passingScore, setPassingScore] = useState<number>(70);
  
  // Lesson Cascade States
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [lessonId, setLessonId] = useState('');

  useEffect(() => {
    if (selectedApp) {
      loadQuizzes();
      getCourses(selectedApp.id).then(setCourses).catch(console.error);
    }
  }, [selectedApp]);

  useEffect(() => {
    if (selectedCourseId) getModules(selectedCourseId).then(setModules).catch(console.error);
    else setModules([]);
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedModuleId) getLessons(selectedModuleId).then(setLessons).catch(console.error);
    else setLessons([]);
  }, [selectedModuleId]);

  const loadQuizzes = async () => {
    if (!selectedApp) return;
    setLoading(true);
    try {
      const data = await getQuizzes(selectedApp.id);
      setQuizzes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingQuiz(null);
    setTitle('');
    setType('MULTIPLE_CHOICE');
    setDifficulty('EASY');
    setStatus('PUBLISHED');
    setPassingScore(70);
    setSelectedCourseId('');
    setSelectedModuleId('');
    setLessonId('');
    setIsModalOpen(true);
  };

  const openEditModal = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setTitle(quiz.title);
    setType(quiz.type);
    setDifficulty(quiz.difficulty);
    setStatus(quiz.status);
    setPassingScore(quiz.passingScore || 70);
    
    // Reset cascade since we might not have the full path loaded
    setSelectedCourseId('');
    setSelectedModuleId('');
    setLessonId(quiz.lessonId || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setSubmitting(true);
    
    const payload = {
      appId: selectedApp.id,
      title: title.trim(),
      type,
      difficulty,
      status,
      isPublished: status === 'PUBLISHED',
      passingScore: passingScore ? Number(passingScore) : null,
      lessonId: lessonId || null,
    };

    try {
      if (editingQuiz) {
        await updateQuiz(editingQuiz.id, payload);
      } else {
        await createQuiz(payload);
      }
      await loadQuizzes();
      setIsModalOpen(false);
    } catch (err) {
      alert(`Failed to ${editingQuiz ? 'update' : 'create'} quiz`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quiz and all its questions?')) return;
    await deleteQuiz(id);
    setQuizzes(quizzes.filter(q => q.id !== id));
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading..." />;
  if (error) return <ErrorState message={error} onRetry={loadQuizzes} />;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quizzes — {selectedApp.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Create multiple-choice or language translation quizzes.</p>
        </div>
        <button 
          onClick={openCreateModal} 
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" /> Create New Quiz
        </button>
      </div>

      {/* QUIZ CARDS GRID */}
      {quizzes.length === 0 ? <EmptyState title="No Quizzes" description="Click 'Create New Quiz' to get started." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${quiz.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {quiz.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                </span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {quiz.type.replace(/_/g, ' ')}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-4">{quiz.title}</h3>
              
              <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                <div className="flex items-center gap-1.5"><Settings className="h-4 w-4" /> {quiz._count?.questions || 0} Questions</div>
                <div className="flex items-center gap-1.5"><Settings className="h-4 w-4" /> Pass: {quiz.passingScore || 0}%</div>
              </div>

              {quiz.lesson?.title && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-md mb-6 border border-slate-100">
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  Linked to: <span className="font-semibold">{quiz.lesson.title}</span>
                </div>
              )}

              <div className="mt-auto flex items-center gap-2 pt-4 border-t border-slate-100">
                <Link href={`/admin/quizzes/${quiz.id}`} className="flex-1 inline-flex justify-center items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                  Manage Questions
                </Link>
                <button onClick={() => openEditModal(quiz)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-slate-200">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(quiz.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors border border-slate-200">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Quiz Title *</label>
                <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Chapter 1 Test" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Quiz Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value as Quiz['type'])} className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="MULTIPLE_CHOICE">Multiple Choice (MCQ)</option>
                    <option value="IMAGE_TO_GERMAN">Image to German</option>
                    <option value="FILL_BLANK">Fill in the Blanks</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Passing Score (%)</label>
                  <input type="number" min="0" max="100" value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Difficulty</label>
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Quiz['difficulty'])} className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as Quiz['status'])} className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="PUBLISHED">Published (Active)</option>
                    <option value="DRAFT">Draft (Hidden)</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Link to Lesson (Optional)
                </label>
                
                {editingQuiz && lessonId && !selectedCourseId && (
                  <div className="mb-3 text-xs text-indigo-600 bg-indigo-50 p-2 rounded">
                    Currently linked to a lesson. Select below only if you want to change it.
                  </div>
                )}

                <div className="space-y-3">
                  <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full rounded border border-slate-300 p-2 text-sm">
                    <option value="">1. Select Course...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  {selectedCourseId && (
                    <select value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)} className="w-full rounded border border-slate-300 p-2 text-sm">
                      <option value="">2. Select Module...</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  )}
                  {selectedModuleId && (
                    <select value={lessonId} onChange={e => setLessonId(e.target.value)} className="w-full rounded border border-emerald-300 p-2 text-sm bg-emerald-50">
                      <option value="">3. Final: Select Lesson...</option>
                      {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50">
                  {submitting ? 'Saving...' : editingQuiz ? 'Save Changes' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}