'use client';

import React, { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getVocabularyById, updateVocabulary } from '@/lib/api/vocabulary';
import type { CreateVocabularyDto, VocabularyItem } from '@/types/vocabulary';
import { VocabularyForm } from '@/features/vocabulary/vocabulary-form';
import { ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function EditVocabularyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { apps, selectedApp } = useAppLevel();

  const [item, setItem] = useState<VocabularyItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadItem = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVocabularyById(id);
      setItem(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load vocabulary item.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  if (loading) {
    return <LoadingState label="Loading vocabulary item..." />;
  }

  if (error || !item) {
    return (
      <ErrorState
        message={error || 'Vocabulary item not found.'}
        onRetry={loadItem}
      />
    );
  }

  const owningApp =
    apps.find((a) => a.id === item.appId) ?? selectedApp ?? null;

  if (!owningApp) {
    return <LoadingState label="Resolving owning German level..." />;
  }

  const handleUpdate = async (payload: CreateVocabularyDto) => {
    setIsSubmitting(true);
    try {
      await updateVocabulary(item.id, payload);
      router.push('/admin/vocabulary');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update vocabulary.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push('/admin/vocabulary')}
          className="mt-1 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Back to Vocabulary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Edit Vocabulary: {item.article ? `${item.article} ` : ''}
            <span className="text-indigo-600">{item.german}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Locked to level <span className="font-semibold">{owningApp.name}</span>.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <VocabularyForm
          mode="edit"
          activeApp={owningApp}
          initialData={item}
          onSubmit={handleUpdate}
          // @ts-ignore
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}