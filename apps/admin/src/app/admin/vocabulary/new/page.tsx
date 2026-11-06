'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { createVocabulary } from '@/lib/api/vocabulary';
import { VocabularyForm } from '@/features/vocabulary/vocabulary-form';
import { LoadingState } from '@/components/feedback/state-views';
import type { CreateVocabularyDto } from '@/types/vocabulary';

export default function CreateVocabularyPage() {
  const router = useRouter();
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoadingApps || !selectedApp) {
    return <LoadingState label="Loading target German level..." />;
  }

  const handleCreate = async (payload: CreateVocabularyDto) => {
    setIsSubmitting(true);
    try {
      await createVocabulary(payload);
      router.push('/admin/vocabulary');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create vocabulary.');
      setIsSubmitting(false); // ফেইল করলে লোডিং স্টেট অফ হবে
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
            Create Vocabulary — {selectedApp.name} ({selectedApp.level})
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Article and German noun are stored separately for automatic flashcard
            and article quiz generation.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <VocabularyForm
          mode="create"
          activeApp={selectedApp}
          onSubmit={handleCreate}
          /* 
            isSubmitting প্রপসটি VocabularyForm এ পাস করা হলো 
            যাতে ফর্মের সেভ বাটনটি 'Saving...' দেখায় 
          */
          // @ts-ignore (যদি আপনার ফর্মে এটি ডিফাইন করা না থাকে, তবে ইগনোর করুন অথবা ফর্মে অ্যাড করে নিন)
          isSubmitting={isSubmitting} 
        />
      </div>
    </div>
  );
}