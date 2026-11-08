'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, FolderOpen, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { 
  getVocabularyCategories, 
  createVocabularyCategory, 
  updateVocabularyCategory, 
  deleteVocabularyCategory 
} from '@/lib/api/vocabulary';
import type { VocabularyCategory } from '@/types/vocabulary';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

// Prisma's _count included in the type
type CategoryWithCount = VocabularyCategory & {
  _count?: { vocabulary: number };
};

export default function VocabularyCategoriesPage() {
  const router = useRouter();
  const { selectedApp, isLoadingApps } = useAppLevel();
  
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', slug: '', germanName: '', banglaName: '', sortOrder: 0 
  });

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

  // Auto-generate slug from English name
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
      setFormData({ 
        name: '', slug: '', germanName: '', banglaName: '', sortOrder: categories.length 
      });
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
        setCategories(categories.map(c => 
          c.id === editingId ? { ...updated, _count: c._count } as CategoryWithCount : c
        ));
      } else {
        const created = await createVocabularyCategory({ ...formData, appId: selectedApp.id });
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/admin/vocabulary')}
            className="mt-1 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Back to Vocabulary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vocabulary Categories</h1>
            <p className="text-sm text-slate-500 mt-1">Manage word groups for {selectedApp.name}</p>
          </div>
        </div>
        <button 
          onClick={() => openModal()} 
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {loading ? (
        <LoadingState label="Loading categories..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCategories} />
      ) : categories.length === 0 ? (
        <EmptyState 
          title="No Categories Found" 
          description={`Create your first category (e.g. Nouns, Verbs, Animals) for ${selectedApp.level} to get started.`} 
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Category Details</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Slug</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-900">Words inside</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">{cat.name}</div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">
                          {cat.germanName || '-'} {cat.germanName && cat.banglaName && '•'} {cat.banglaName || '-'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600 border border-slate-200">
                      {cat.slug}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                      {cat._count?.vocabulary || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => openModal(cat)} 
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors mr-1"
                      title="Edit Category"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(cat.id)} 
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit Category' : 'Create New Category'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Category Name (English) *</label>
                <input 
                  required type="text" 
                  value={formData.name} 
                  onChange={(e) => handleNameChange(e.target.value)} 
                  className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none text-sm" 
                  placeholder="e.g. Greetings" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">URL Slug *</label>
                <input 
                  required type="text" 
                  value={formData.slug} 
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })} 
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">German Name</label>
                  <input 
                    type="text" 
                    value={formData.germanName} 
                    onChange={(e) => setFormData({ ...formData, germanName: e.target.value })} 
                    className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none text-sm" 
                    placeholder="e.g. Begrüßungen" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Bangla Name</label>
                  <input 
                    type="text" 
                    value={formData.banglaName} 
                    onChange={(e) => setFormData({ ...formData, banglaName: e.target.value })} 
                    className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none text-sm" 
                    placeholder="e.g. অভিবাদন" 
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
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