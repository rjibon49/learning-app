'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Volume2, Image as ImageIcon, BookOpen, FileAudio } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { 
  getAdminVocabularyList, 
  createVocabulary,
  updateVocabulary,
  deleteVocabulary, 
  getVocabularyCategories 
} from '@/lib/api/vocabulary';
import type { VocabularyItem, VocabularyCategory } from '@/types/vocabulary';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';
import { MediaPickerModal } from '@/components/media/MediaPickerModal';

export default function AdminVocabularyPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>([]);
  const [categories, setCategories] = useState<VocabularyCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for New/Edit Word
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Media Picker States
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isAudioPickerOpen, setIsAudioPickerOpen] = useState(false);
  const [imageAsset, setImageAsset] = useState<{ id: string, url: string } | null>(null);
  const [audioAsset, setAudioAsset] = useState<{ id: string, url: string } | null>(null);

  const [formData, setFormData] = useState({
    german: '',
    english: '',
    bangla: '',
    article: '' as 'der' | 'die' | 'das' | '',
    pluralGerman: '',
    pronunciationBangla: '',
    categoryId: '',
    difficulty: 'EASY' as 'EASY' | 'MEDIUM' | 'HARD',
    isPublished: true,
  });

  const loadData = useCallback(async () => {
    if (!selectedApp) return;
    setLoading(true);
    setError(null);
    try {
      const [vocabData, catData] = await Promise.all([
        getAdminVocabularyList({ appId: selectedApp.id, categoryId: selectedCategory || undefined }),
        getVocabularyCategories(selectedApp.id),
      ]);
      setVocabularyList(vocabData);
      setCategories(catData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vocabulary.');
    } finally {
      setLoading(false);
    }
  }, [selectedApp, selectedCategory]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      german: '', english: '', bangla: '', article: '', pluralGerman: '', 
      pronunciationBangla: '', categoryId: '', difficulty: 'EASY', isPublished: true
    });
    setImageAsset(null);
    setAudioAsset(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setFormData({
      german: item.german,
      english: item.english,
      bangla: item.bangla,
      article: (item.article as any) || '',
      pluralGerman: item.pluralGerman || '',
      pronunciationBangla: item.pronunciationBangla || '',
      categoryId: item.categoryId || '',
      difficulty: item.difficulty || 'EASY',
      isPublished: item.isPublished,
    });
    
    // Set existing media if available
    setImageAsset(item.imageAssetId && item.imageUrl ? { id: item.imageAssetId, url: item.imageUrl } : null);
    setAudioAsset(item.audioAssetId && item.audioUrl ? { id: item.audioAssetId, url: item.audioUrl } : null);
    
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setSaving(true);
    
    const payload = {
      appId: selectedApp.id,
      german: formData.german.trim(),
      english: formData.english.trim(),
      bangla: formData.bangla.trim(),
      article: formData.article || undefined,
      pluralGerman: formData.pluralGerman.trim() || undefined,
      pronunciationBangla: formData.pronunciationBangla.trim() || undefined,
      categoryId: formData.categoryId || undefined,
      difficulty: formData.difficulty,
      isPublished: formData.isPublished,
      status: formData.isPublished ? 'PUBLISHED' : 'DRAFT',
      
      // Media Fields
      imageUrl: imageAsset?.url || null,
      imageAssetId: imageAsset?.id || null,
      audioUrl: audioAsset?.url || null,
      audioAssetId: audioAsset?.id || null,
    };

    try {
      if (editingId) {
        await updateVocabulary(editingId, payload as any);
      } else {
        await createVocabulary(payload as any);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save vocabulary item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vocabulary word?')) return;
    try {
      await deleteVocabulary(id);
      setVocabularyList(vocabularyList.filter((item) => item.id !== id));
    } catch (err) {
      alert('Failed to delete vocabulary item.');
    }
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading environment..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vocabulary — {selectedApp.name}</h1>
          <p className="text-sm text-slate-500">Manage German words, meanings, audio, and images for this level.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Word
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-sm font-medium text-slate-700">Filter by Category:</span>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 bg-slate-50"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} {cat.germanName ? `(${cat.germanName})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Content List */}
      {loading ? (
        <LoadingState label="Loading vocabulary..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : vocabularyList.length === 0 ? (
        <EmptyState title="No Vocabulary Found" description="Add your first German word to get started." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left font-semibold text-slate-700">
              <tr>
                <th className="px-6 py-3">German Word</th>
                <th className="px-6 py-3">English</th>
                <th className="px-6 py-3">Bangla</th>
                <th className="px-6 py-3 text-center">Media</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {vocabularyList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {item.article && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded uppercase ${
                          item.article === 'der' ? 'bg-blue-50 text-blue-700' :
                          item.article === 'die' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {item.article}
                        </span>
                      )}
                      <span className="font-bold text-slate-900">{item.german}</span>
                    </div>
                    {item.pluralGerman && (
                      <div className="text-xs text-slate-400 mt-0.5">Plural: {item.pluralGerman}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{item.english}</td>
                  <td className="px-6 py-4 text-slate-700">
                    <div>{item.bangla}</div>
                    {item.pronunciationBangla && (
                      <div className="text-xs text-slate-400">উচ্চারণ: {item.pronunciationBangla}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      {((item as any).imageAssetId || item.imageUrl) ? (
                        <span title="Has Image">
                          <ImageIcon className="h-4 w-4 text-indigo-500" />
                        </span>
                      ) : (
                        <span title="No Image">
                          <ImageIcon className="h-4 w-4 text-slate-300" />
                        </span>
                      )}
                      
                      {((item as any).audioAssetId || item.audioUrl) ? (
                        <span title="Has Audio">
                          <Volume2 className="h-4 w-4 text-amber-500" />
                        </span>
                      ) : (
                        <span title="No Audio">
                          <Volume2 className="h-4 w-4 text-slate-300" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(item)}
                      className="text-slate-400 hover:text-indigo-600 p-1 rounded transition-colors mr-2"
                      title="Edit Word"
                    >
                      <Edit2 className="h-4 w-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-rose-400 hover:text-rose-600 p-1 rounded transition-colors"
                      title="Delete Word"
                    >
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Word Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl my-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editingId ? 'Edit Vocabulary' : 'Add New Vocabulary'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Article</label>
                  <select
                    value={formData.article}
                    onChange={(e) => setFormData({ ...formData, article: e.target.value as any })}
                    className="w-full rounded-md border border-slate-300 p-2 text-sm bg-slate-50"
                  >
                    <option value="">None</option>
                    <option value="der">der (Masc)</option>
                    <option value="die">die (Fem)</option>
                    <option value="das">das (Neu)</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">German Word *</label>
                  <input
                    required type="text" value={formData.german}
                    onChange={(e) => setFormData({ ...formData, german: e.target.value })}
                    placeholder="Apfel" className="w-full rounded-md border border-slate-300 p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Plural Form</label>
                  <input
                    type="text" value={formData.pluralGerman}
                    onChange={(e) => setFormData({ ...formData, pluralGerman: e.target.value })}
                    placeholder="die Äpfel" className="w-full rounded-md border border-slate-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full rounded-md border border-slate-300 p-2 text-sm bg-slate-50"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">English Meaning *</label>
                  <input
                    required type="text" value={formData.english}
                    onChange={(e) => setFormData({ ...formData, english: e.target.value })}
                    placeholder="Apple" className="w-full rounded-md border border-slate-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Bangla Meaning *</label>
                  <input
                    required type="text" value={formData.bangla}
                    onChange={(e) => setFormData({ ...formData, bangla: e.target.value })}
                    placeholder="আপেল" className="w-full rounded-md border border-slate-300 p-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Bangla Pronunciation</label>
                <input
                  type="text" value={formData.pronunciationBangla}
                  onChange={(e) => setFormData({ ...formData, pronunciationBangla: e.target.value })}
                  placeholder="আফেল" className="w-full rounded-md border border-slate-300 p-2 text-sm"
                />
              </div>

              {/* ================= MEDIA SELECTION AREA ================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                {/* IMAGE PICKER */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">Vocabulary Image</label>
                  {imageAsset ? (
                    <div className="flex items-center gap-3">
                      <img src={imageAsset.url} alt="Selected" className="h-14 w-14 rounded object-cover border border-slate-200" />
                      <div className="flex flex-col gap-1">
                        <button type="button" onClick={() => setIsImagePickerOpen(true)} className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 font-medium">Change Image</button>
                        <button type="button" onClick={() => setImageAsset(null)} className="text-xs px-2 py-1 bg-rose-100 text-rose-700 rounded hover:bg-rose-200 font-medium">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setIsImagePickerOpen(true)} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 text-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                      <ImageIcon className="h-4 w-4" /> Select Image
                    </button>
                  )}
                </div>

                {/* AUDIO PICKER */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">Pronunciation Audio</label>
                  {audioAsset ? (
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded bg-amber-100 flex items-center justify-center border border-amber-200 shrink-0">
                        <FileAudio className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="flex flex-col gap-1 w-full overflow-hidden">
                        <audio controls src={audioAsset.url} className="h-6 w-full" />
                        <div className="flex gap-2 mt-1">
                          <button type="button" onClick={() => setIsAudioPickerOpen(true)} className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 font-medium">Change</button>
                          <button type="button" onClick={() => setAudioAsset(null)} className="text-xs px-2 py-1 bg-rose-100 text-rose-700 rounded hover:bg-rose-200 font-medium">Remove</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setIsAudioPickerOpen(true)} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 text-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                      <Volume2 className="h-4 w-4" /> Select Audio
                    </button>
                  )}
                </div>
              </div>
              {/* ================= END MEDIA SELECTION AREA ================= */}

              <div className="flex items-center gap-4 pt-2 border-t border-slate-100 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-semibold text-slate-700">Published Status</span>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm border border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Word' : 'Save Word'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker Modals */}
      {isImagePickerOpen && (
        <MediaPickerModal 
          appId={selectedApp.id} 
          allowedTypes={['IMAGE']} 
          onSelect={(asset) => {
            setImageAsset({ id: asset.id, url: asset.publicUrl! });
            setIsImagePickerOpen(false);
          }} 
          onClose={() => setIsImagePickerOpen(false)} 
        />
      )}

      {isAudioPickerOpen && (
        <MediaPickerModal 
          appId={selectedApp.id} 
          allowedTypes={['AUDIO']} 
          onSelect={(asset) => {
            setAudioAsset({ id: asset.id, url: asset.publicUrl! });
            setIsAudioPickerOpen(false);
          }} 
          onClose={() => setIsAudioPickerOpen(false)} 
        />
      )}
    </div>
  );
}