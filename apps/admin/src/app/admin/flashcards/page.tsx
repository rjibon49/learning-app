'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, Plus, Trash2, Edit3, BookOpen, X } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getDecks, createDeck, updateDeck, deleteDeck, type FlashcardDeck } from '@/lib/api/flashcards';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminFlashcardsPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<FlashcardDeck['difficulty']>('EASY');
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    if (selectedApp) loadDecks();
  }, [selectedApp]);

  const loadDecks = async () => {
    if (!selectedApp) return;
    setLoading(true);
    try {
      const data = await getDecks(selectedApp.id);
      setDecks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decks');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingDeck(null);
    setTitle('');
    setDescription('');
    setDifficulty('EASY');
    setIsPublished(true);
    setIsModalOpen(true);
  };

  const openEditModal = (deck: FlashcardDeck) => {
    setEditingDeck(deck);
    setTitle(deck.title);
    setDescription(deck.description || '');
    setDifficulty(deck.difficulty);
    setIsPublished(deck.isPublished);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setSubmitting(true);

    const payload = {
      appId: selectedApp.id,
      title: title.trim(),
      description: description.trim() || null,
      difficulty,
      isPublished,
    };

    try {
      if (editingDeck) {
        await updateDeck(editingDeck.id, payload);
      } else {
        await createDeck(payload);
      }
      await loadDecks();
      setIsModalOpen(false);
    } catch (err) {
      alert('Failed to save flashcard deck');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deck?')) return;
    await deleteDeck(id);
    setDecks(decks.filter(d => d.id !== id));
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading..." />;
  if (error) return <ErrorState message={error} onRetry={loadDecks} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" /> Flashcard Decks — {selectedApp.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage vocabulary revision decks for students.</p>
        </div>
        <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
          <Plus className="h-4 w-4" /> Create Deck
        </button>
      </div>

      {decks.length === 0 ? <EmptyState title="No Flashcard Decks" description="Create your first deck to get started." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <div key={deck.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${deck.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {deck.isPublished ? 'Published' : 'Draft'}
                </span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{deck.difficulty}</span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-1">{deck.title}</h3>
              <p className="text-xs text-slate-500 mb-4 line-clamp-2">{deck.description || 'No description provided.'}</p>

              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-md mb-6 border border-slate-100">
                <BookOpen className="h-4 w-4 text-slate-400" />
                Total Words in Deck: <span className="font-bold text-slate-900">{deck._count?.items || 0}</span>
              </div>

              <div className="mt-auto flex items-center gap-2 pt-4 border-t border-slate-100">
                <Link href={`/admin/flashcards/${deck.id}`} className="flex-1 inline-flex justify-center items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                  Manage Words
                </Link>
                <button onClick={() => openEditModal(deck)} className="p-2 text-slate-400 hover:text-indigo-600 rounded border border-slate-200">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(deck.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded border border-slate-200">
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
              <h2 className="text-lg font-bold text-slate-900">{editingDeck ? 'Edit Deck' : 'Create Flashcard Deck'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Deck Title *</label>
                <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm" placeholder="e.g. A1 Basic Verbs" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm" placeholder="Short description..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Difficulty</label>
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm">
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select value={isPublished ? 'true' : 'false'} onChange={(e) => setIsPublished(e.target.value === 'true')} className="w-full rounded-md border border-slate-300 p-2.5 text-sm">
                    <option value="true">Published</option>
                    <option value="false">Draft</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500">
                  {submitting ? 'Saving...' : editingDeck ? 'Save Changes' : 'Create Deck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}