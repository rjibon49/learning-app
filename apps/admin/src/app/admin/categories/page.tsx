'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import {
  createVocabularyCategory,
  getVocabularyCategories,
} from '@/lib/api/vocabulary';
import type { VocabularyCategory } from '@/types/vocabulary';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/feedback/state-views';

function slugifyCategory(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export default function AdminCategoriesPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();

  const [categories, setCategories] = useState<VocabularyCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [germanName, setGermanName] = useState('');
  const [banglaName, setBanglaName] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    if (!selectedApp) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getVocabularyCategories(selectedApp.id);
      const isolated = data
        .filter((c) => c.appId === selectedApp.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setCategories(isolated);
      setSortOrder(isolated.length + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load categories.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedApp]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setCreateError(null);
    setCreating(true);

    try {
      await createVocabularyCategory({
        appId: selectedApp.id,
        name: name.trim(),
        slug: (slug.trim() || slugifyCategory(name)).trim(),
        germanName: germanName.trim() || undefined,
        banglaName: banglaName.trim() || undefined,
        sortOrder: Number(sortOrder) || 1,
      });
      setName('');
      setSlug('');
      setGermanName('');
      setBanglaName('');
      await loadCategories();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create category.'
      );
    } finally {
      setCreating(false);
    }
  };

  if (isLoadingApps || !selectedApp) {
    return <LoadingState label="Loading level configuration..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Vocabulary Categories — {selectedApp.name} ({selectedApp.level})
        </h1>
        <p className="text-sm text-slate-500">
          Categories are strictly isolated to `{selectedApp.name}` (`appId:{' '}
          {selectedApp.id}`).
        </p>
      </div>

      {/* Create Category Form */}
      <form
        onSubmit={handleCreate}
        className="rounded-lg border border-slate-200 bg-white p-6"
      >
        <h2 className="text-base font-semibold text-slate-900">
          Add Category to {selectedApp.level}
        </h2>

        {createError && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {createError}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              English Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) {
                  setSlug(slugifyCategory(e.target.value));
                }
              }}
              placeholder="Animals"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Slug *
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(slugifyCategory(e.target.value))}
              placeholder="animals"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              German Name
            </label>
            <input
              type="text"
              value={germanName}
              onChange={(e) => setGermanName(e.target.value)}
              placeholder="Tiere"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Bangla Name (বাংলা)
            </label>
            <input
              type="text"
              value={banglaName}
              onChange={(e) => setBanglaName(e.target.value)}
              placeholder="প্রাণী"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Sort Order
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {creating ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Categories Table */}
      {loading ? (
        <LoadingState label={`Loading ${selectedApp.level} categories...`} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCategories} />
      ) : categories.length === 0 ? (
        <EmptyState
          title={`No categories in ${selectedApp.name} yet`}
          description="Create your first category (e.g., Animals, Family, Food) using the form above."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">German</th>
                <th className="px-4 py-3">Bangla</th>
                <th className="px-4 py-3">Slug</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {cat.sortOrder}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {cat.name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {cat.germanName || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {cat.banglaName || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {cat.slug}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}