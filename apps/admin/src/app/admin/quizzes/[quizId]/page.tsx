'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Edit3, Image as ImageIcon, X } from 'lucide-react';
import { getQuizQuestions, createQuestion, updateQuestion, deleteQuestion, type QuizQuestion, type QuizType } from '@/lib/api/quizzes';
import { LoadingState } from '@/components/feedback/state-views';

export default function ManageQuizQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  // Form States
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<QuizType>('MULTIPLE_CHOICE');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [optionsStr, setOptionsStr] = useState(''); 
  const [imageUrl, setImageUrl] = useState('');

  const loadQuestions = async () => {
    try {
      const data = await getQuizQuestions(quizId);
      setQuestions(data);
    } catch (err) {
      alert('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quizId) loadQuestions();
  }, [quizId]);

  const handleOpenEdit = (q: QuizQuestion) => {
    setEditingQuestion(q);
    setQuestionText(q.questionText || '');
    setQuestionType(q.questionType);
    setCorrectAnswer(q.correctAnswer);
    setImageUrl(q.imageUrl || '');
    setOptionsStr(q.optionsJson && Array.isArray(q.optionsJson) ? q.optionsJson.join(', ') : '');
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setQuestionText('');
    setQuestionType('MULTIPLE_CHOICE');
    setCorrectAnswer('');
    setOptionsStr('');
    setImageUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const optionsJson = questionType === 'MULTIPLE_CHOICE' 
      ? optionsStr.split(',').map(s => s.trim()).filter(Boolean) 
      : null;

    try {
      const payload = {
        quizId,
        questionType,
        questionText: questionText.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        correctAnswer: correctAnswer.trim(),
        optionsJson: optionsJson || undefined,
      };

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, payload);
      } else {
        await createQuestion({
          ...payload,
          sortOrder: questions.length + 1,
        });
      }

      handleCancelEdit();
      await loadQuestions();
    } catch (err) {
      alert(`Failed to ${editingQuestion ? 'update' : 'create'} question`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    await deleteQuestion(id);
    setQuestions(questions.filter(q => q.id !== id));
  };

  if (loading) return <LoadingState label="Loading questions..." />;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Quizzes
      </button>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">
          {editingQuestion ? 'Edit Question' : 'Manage Questions'}
        </h1>
        {editingQuestion && (
          <button onClick={handleCancelEdit} className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1">
            <X className="h-4 w-4" /> Cancel Edit
          </button>
        )}
      </div>

      {/* CREATE / EDIT QUESTION FORM */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          {editingQuestion ? `Editing Question #${questions.findIndex(q => q.id === editingQuestion.id) + 1}` : 'Add New Question'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Question Type</label>
            <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuizType)} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:outline-none">
              <option value="MULTIPLE_CHOICE">Multiple Choice (MCQ)</option>
              <option value="IMAGE_TO_GERMAN">Image to German (Write)</option>
              <option value="FILL_BLANK">Fill in the Blanks</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Correct Answer *</label>
            <input required type="text" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} placeholder="The exact correct answer" className="w-full rounded-md border border-slate-300 p-2 text-sm focus:outline-none border-emerald-500" />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Question Text (Optional for Image Quiz)</label>
          <input type="text" value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="e.g. What is the German word for Apple?" className="w-full rounded-md border border-slate-300 p-2 text-sm focus:outline-none" />
        </div>

        {questionType === 'MULTIPLE_CHOICE' && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">MCQ Options (Comma Separated)</label>
            <input required type="text" value={optionsStr} onChange={(e) => setOptionsStr(e.target.value)} placeholder="e.g. Apfel, Banane, Orange, Birne" className="w-full rounded-md border border-slate-300 p-2 text-sm focus:outline-none" />
          </div>
        )}

        {questionType === 'IMAGE_TO_GERMAN' && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-4">
            <ImageIcon className="h-6 w-6 text-indigo-500 mt-1" />
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase text-indigo-800 mb-1">Image URL</label>
              <input required type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/apple.jpg" className="w-full rounded-md border border-indigo-200 p-2 text-sm focus:outline-none" />
              <p className="text-[10px] text-indigo-600 mt-1">Students will see this image and must write the exact correct answer.</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="rounded-md bg-slate-900 px-6 py-2 text-sm font-semibold text-white">
            {submitting ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question'}
          </button>
          {editingQuestion && (
            <button type="button" onClick={handleCancelEdit} className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* QUESTIONS LIST */}
      <div className="space-y-4">
        {questions.map((q, index) => (
          <div key={q.id} className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm flex items-start justify-between">
            <div>
              <span className="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded mb-2">
                Q{index + 1} — {q.questionType.replace(/_/g, ' ')}
              </span>
              <h3 className="font-semibold text-slate-900">{q.questionText || <span className="italic text-slate-400">No question text</span>}</h3>
              
              {q.imageUrl && (
                <div className="mt-2">
                  <img src={q.imageUrl} alt="Quiz preview" className="h-16 w-16 rounded object-cover border border-slate-200" />
                </div>
              )}

              {q.optionsJson && Array.isArray(q.optionsJson) && (
                <ul className="mt-2 flex gap-2 flex-wrap">
                  {q.optionsJson.map((opt: string, i: number) => (
                    <li key={i} className="bg-slate-50 border border-slate-200 text-xs px-2 py-1 rounded">{opt}</li>
                  ))}
                </ul>
              )}
              
              <div className="mt-3 text-sm">
                <span className="text-slate-500 mr-2">Correct Answer:</span>
                <span className="font-bold text-emerald-600">{q.correctAnswer}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button onClick={() => handleOpenEdit(q)} className="p-2 text-slate-400 hover:text-indigo-600 rounded">
                <Edit3 className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(q.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}