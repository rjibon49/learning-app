'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Search, Image as ImageIcon } from 'lucide-react';
import { getDeckItems, addDeckItems, removeDeckItem, type FlashcardDeckItem } from '@/lib/api/flashcards';
import { getAdminVocabularyList as getVocabularyList } from '@/lib/api/vocabulary';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { LoadingState } from '@/components/feedback/state-views';

// Local Vocabulary Interface
export interface Vocabulary {
  id: string;
  article?: string | null;
  german: string;
  english: string;
  bangla: string;
  imageUrl?: string | null;
}

export default function ManageDeckItemsPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const { selectedApp } = useAppLevel();

  const [items, setItems] = useState<FlashcardDeckItem[]>([]);
  const [allVocab, setAllVocab] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection Modal
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [selectedVocabIds, setSelectedVocabIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const deckItems = await getDeckItems(deckId);
      setItems(deckItems);
      if (selectedApp) {
        const vocabList = await getVocabularyList(selectedApp.id);
        setAllVocab(vocabList);
      }
    } catch (err) {
      alert('Failed to load flashcard items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deckId && selectedApp) loadData();
  }, [deckId, selectedApp]);

  const handleAddWords = async () => {
    if (selectedVocabIds.length === 0) return;
    setSubmitting(true);
    try {
      await addDeckItems(deckId, selectedVocabIds);
      setSelectedVocabIds([]);
      setIsSelectModalOpen(false);
      await loadData();
    } catch (err) {
      alert('Failed to add words to deck');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Remove this word from deck?')) return;
    try {
      await removeDeckItem(itemId);
      setItems(items.filter(i => i.id !== itemId));
    } catch (err) {
      alert('Failed to remove item');
    }
  };

  if (loading) return <LoadingState label="Loading deck items..." />;

  // Filter out already added words
  const addedVocabIds = new Set(items.map(i => i.vocabularyId));
  const availableVocab = allVocab.filter(v => !addedVocabIds.has(v.id) && (
    v.german.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.bangla.includes(searchQuery)
  ));

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Decks
      </button>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Deck Words</h1>
          <p className="text-sm text-slate-500 mt-1">Add vocabulary words to this flashcard deck.</p>
        </div>
        <button onClick={() => setIsSelectModalOpen(true)} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-indigo-500">
          <Plus className="h-4 w-4" /> Add Words from Vocabulary
        </button>
      </div>

      {/* ITEMS LIST */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
          No words added to this deck yet. Click "Add Words from Vocabulary" to start.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <div key={item.id} className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm flex items-start gap-4">
              {item.vocabulary.imageUrl ? (
                <img src={item.vocabulary.imageUrl} alt="" className="h-14 w-14 rounded object-cover border border-slate-100 flex-shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                  <span className="font-bold text-slate-900 text-base">{item.vocabulary.article} {item.vocabulary.german}</span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5 truncate">EN: {item.vocabulary.english}</div>
                <div className="text-xs text-indigo-600 font-medium mt-0.5 truncate">BN: {item.vocabulary.bangla}</div>
              </div>

              <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-rose-600 p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* VOCABULARY SELECTION MODAL */}
      {isSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Select Vocabulary Words</h2>
              <button onClick={() => setIsSelectModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 bg-white rounded-md border border-slate-200 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search by german, english or bangla..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full text-sm outline-none" />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {availableVocab.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No available vocabulary found.</div>
              ) : (
                availableVocab.map((vocab) => {
                  const isSelected = selectedVocabIds.includes(vocab.id);
                  return (
                    <div 
                      key={vocab.id} 
                      onClick={() => {
                        if (isSelected) setSelectedVocabIds(selectedVocabIds.filter(id => id !== vocab.id));
                        else setSelectedVocabIds([...selectedVocabIds, vocab.id]);
                      }}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={isSelected} onChange={() => {}} className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{vocab.article} {vocab.german}</div>
                          <div className="text-xs text-slate-500">{vocab.english} • {vocab.bangla}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50">
              <span className="text-xs font-medium text-slate-600">{selectedVocabIds.length} words selected</span>
              <div className="flex gap-2">
                <button onClick={() => setIsSelectModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                <button onClick={handleAddWords} disabled={submitting || selectedVocabIds.length === 0} className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50">
                  {submitting ? 'Adding...' : 'Add Selected Words'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}