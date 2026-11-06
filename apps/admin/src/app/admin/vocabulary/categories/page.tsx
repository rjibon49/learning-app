'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, FolderOpen } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { 
  getVocabularyCategories, 
  createVocabularyCategory, 
  updateVocabularyCategory, 
  deleteVocabularyCategory 
} from '@/lib/api/vocabulary';
import type { VocabularyCategory } from '@/types/vocabulary';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

// ১. বিদ্যমান টাইপের সাথে _count যুক্ত করে লোকাল টাইপ বানানো হলো
type CategoryWithCount = VocabularyCategory & {
  _count?: { vocabulary: number };
};

export default function VocabularyCategoriesPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  
  // ২. useState এ নতুন CategoryWithCount টাইপ ব্যবহার করা হলো
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', germanName: '', banglaName: '', sortOrder: 0 });

  const loadCategories = useCallback(async () => {
    if (!selectedApp) return;
    setLoading(true);
    try {
      const data = await getVocabularyCategories(selectedApp.id);
      setCategories(data as CategoryWithCount[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, [selectedApp]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData((prev) => ({ ...prev, name, slug }));
  };

  const openModal = (category?: CategoryWithCount) => {
    if (category) {
      setEditingId(category.id);
      setFormData({
        name: category.name,
        slug: category.slug,
        germanName: category.germanName || '',
        banglaName: category.banglaName || '',
        sortOrder: category.sortOrder,
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', slug: '', germanName: '', banglaName: '', sortOrder: categories.length });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateVocabularyCategory(editingId, formData);
        // ৩. Update এর সময় Type casting করা হলো
        setCategories(categories.map(c => (c.id === editingId ? { ...updated, _count: c._count } as CategoryWithCount : c)));
      } else {
        const created = await createVocabularyCategory({ ...formData, appId: selectedApp.id });
        // ৩. Create এর সময় Type casting করা হলো
        setCategories([...categories, { ...created, _count: { vocabulary: 0 } } as CategoryWithCount]);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Words inside it will lose their category association.')) return;
    try {
      await deleteVocabularyCategory(id);
      setCategories(categories.filter(c => c.id !== id));
    } catch (err) {
      alert('Failed to delete category');
    }
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vocabulary Categories</h1>
          <p className="text-sm text-slate-500">Manage word groups for {selectedApp.name}</p>
        </div>
        <button onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {loading ? (
        <LoadingState label="Loading categories..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCategories} />
      ) : categories.length === 0 ? (
        <EmptyState title="No Categories Found" description="Create your first category (e.g. Nouns, Verbs, Animals) to get started." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Category Details</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Slug</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-900">Words</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><FolderOpen className="h-5 w-5" /></div>
                      <div>
                        <div className="font-bold text-slate-900">{cat.name}</div>
                        <div className="text-xs text-slate-500">
                          {cat.germanName} {cat.germanName && cat.banglaName && '•'} {cat.banglaName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{cat.slug}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                      {cat._count?.vocabulary || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openModal(cat)} className="text-indigo-600 hover:text-indigo-900 mx-2"><Edit2 className="h-4 w-4 inline" /></button>
                    <button onClick={() => handleDelete(cat.id)} className="text-rose-600 hover:text-rose-900"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editingId ? 'Edit Category' : 'Create Category'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Category Name (English)</label>
                <input required type="text" value={formData.name} onChange={(e) => handleNameChange(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 p-2 border shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g. Greetings" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Slug</label>
                <input required type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="mt-1 block w-full rounded-md border-slate-300 p-2 border bg-slate-50 font-mono text-sm shadow-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">German Name</label>
                  <input type="text" value={formData.germanName} onChange={(e) => setFormData({ ...formData, germanName: e.target.value })} className="mt-1 block w-full rounded-md border-slate-300 p-2 border shadow-sm sm:text-sm" placeholder="e.g. Begrüßungen" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Bangla Name</label>
                  <input type="text" value={formData.banglaName} onChange={(e) => setFormData({ ...formData, banglaName: e.target.value })} className="mt-1 block w-full rounded-md border-slate-300 p-2 border shadow-sm sm:text-sm" placeholder="e.g. অভিবাদন" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}