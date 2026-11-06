'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Volume2, FileAudio } from 'lucide-react';
import type {
  ContentStatus,
  CreateVocabularyDto,
  GermanArticle,
  VocabularyCategory,
  VocabularyDifficulty,
  VocabularyItem,
} from '@/types/vocabulary';
import type { LearningApp } from '@/types/app';
import { getVocabularyCategories } from '@/lib/api/vocabulary';
import { MediaPickerModal } from '@/components/media/MediaPickerModal';

interface VocabularyFormProps {
  mode: 'create' | 'edit';
  activeApp: LearningApp;
  initialData?: VocabularyItem;
  onSubmit: (payload: CreateVocabularyDto) => Promise<void>;
  isSubmitting?: boolean;
}

const ARTICLES: GermanArticle[] = ['der', 'die', 'das'];
const DIFFICULTIES: VocabularyDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const STATUSES: ContentStatus[] = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'];

export function VocabularyForm({
  mode,
  activeApp,
  initialData,
  onSubmit,
  isSubmitting: parentSubmitting = false,
}: VocabularyFormProps) {
  const router = useRouter();

  const [categories, setCategories] = useState<VocabularyCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId ?? '');
  const [lessonId, setLessonId] = useState<string>(initialData?.lessonId ?? '');
  const [article, setArticle] = useState<GermanArticle | ''>(initialData?.article ?? 'der');
  const [german, setGerman] = useState<string>(initialData?.german ?? '');
  const [english, setEnglish] = useState<string>(initialData?.english ?? '');
  const [bangla, setBangla] = useState<string>(initialData?.bangla ?? '');
  const [pronunciationBangla, setPronunciationBangla] = useState<string>(initialData?.pronunciationBangla ?? '');
  const [pluralGerman, setPluralGerman] = useState<string>(initialData?.pluralGerman ?? '');
  const [exampleGerman, setExampleGerman] = useState<string>(initialData?.exampleGerman ?? '');
  const [exampleEnglish, setExampleEnglish] = useState<string>(initialData?.exampleEnglish ?? '');
  const [exampleBangla, setExampleBangla] = useState<string>(initialData?.exampleBangla ?? '');
  
  const [difficulty, setDifficulty] = useState<VocabularyDifficulty>(initialData?.difficulty ?? 'EASY');
  const [status, setStatus] = useState<ContentStatus>(initialData?.status ?? (initialData?.isPublished ? 'PUBLISHED' : 'DRAFT'));
  const [isPublished, setIsPublished] = useState<boolean>(initialData?.isPublished ?? true);

  const [internalSubmitting, setInternalSubmitting] = useState<boolean>(false);
  const submitting = parentSubmitting || internalSubmitting;
  const [formError, setFormError] = useState<string | null>(null);

  // === MEDIA PICKER STATES ===
  const [imageUrl, setImageUrl] = useState<string>(initialData?.imageUrl ?? '');
  const [imageAssetId, setImageAssetId] = useState<string>((initialData as any)?.imageAssetId ?? '');
  const [audioUrl, setAudioUrl] = useState<string>(initialData?.audioUrl ?? '');
  const [audioAssetId, setAudioAssetId] = useState<string>((initialData as any)?.audioAssetId ?? '');
  
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isAudioPickerOpen, setIsAudioPickerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchLevelCategories() {
      setLoadingCategories(true);
      setCategoryError(null);
      try {
        const list = await getVocabularyCategories(activeApp.id);
        const isolated = list.filter((cat) => cat.appId === activeApp.id);
        if (isMounted) {
          setCategories(isolated);
          setCategoryId((prev) => {
            if (prev && isolated.some((c) => c.id === prev)) {
              return prev;
            }
            return isolated[0]?.id ?? '';
          });
        }
      } catch (err) {
        if (isMounted) {
          setCategoryError(err instanceof Error ? err.message : 'Failed to load categories for this level.');
        }
      } finally {
        if (isMounted) {
          setLoadingCategories(false);
        }
      }
    }

    void fetchLevelCategories();
    return () => {
      isMounted = false;
    };
  }, [activeApp.id]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!categoryId) {
      setFormError(`Please select a valid category for ${activeApp.name} (${activeApp.level}).`);
      return;
    }

    if (!german.trim() || !english.trim() || !bangla.trim()) {
      setFormError('German, English, and Bangla meanings are required.');
      return;
    }

    const payload: CreateVocabularyDto = {
      appId: activeApp.id,
      categoryId,
      lessonId: lessonId.trim() ? lessonId.trim() : undefined,
      article: article ? article : null,
      german: german.trim(),
      english: english.trim(),
      bangla: bangla.trim(),
      pronunciationBangla: pronunciationBangla.trim() || undefined,
      pluralGerman: pluralGerman.trim() || undefined,
      exampleGerman: exampleGerman.trim() || undefined,
      exampleEnglish: exampleEnglish.trim() || undefined,
      exampleBangla: exampleBangla.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      audioUrl: audioUrl.trim() || undefined,
      difficulty,
      status,
      isPublished,
    };
    
    // Add R2 Media IDs if available
    if (imageAssetId) (payload as any).imageAssetId = imageAssetId;
    if (audioAssetId) (payload as any).audioAssetId = audioAssetId;

    setInternalSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save vocabulary.');
    } finally {
      setInternalSubmitting(false);
    }
  };

  const combinedPreview = `${article ? `${article} ` : ''}${german.trim() || 'Bär'}`;

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
        {formError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        {categoryError && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {categoryError}
          </div>
        )}

        {/* Level & Category Isolation Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Target Level (Locked to App ID)
            </label>
            <input
              type="text"
              disabled
              value={`${activeApp.name} (${activeApp.level})`}
              className="mt-1 w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Category ({activeApp.level} only) *
            </label>
            <select
              required
              disabled={loadingCategories || categories.length === 0}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {categories.length === 0 ? (
                <option value="">
                  {loadingCategories
                    ? 'Loading categories...'
                    : `No categories in ${activeApp.level} — create one first`}
                </option>
              ) : (
                categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                    {cat.germanName ? ` (${cat.germanName})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Lesson ID (Optional)
            </label>
            <input
              type="text"
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              placeholder="Optional Lesson ID"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Article + German Word + Display Preview */}
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">
                German Article
              </label>
              <select
                value={article}
                onChange={(e) =>
                  setArticle(e.target.value as GermanArticle | '')
                }
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="der">der (Masculine)</option>
                <option value="die">die (Feminine)</option>
                <option value="das">das (Neuter)</option>
                <option value="">None (Verb / Adjective / Phrase)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-600">
                German Word (ä, ö, ü, Ä, Ö, Ü, ß) *
              </label>
              <input
                type="text"
                required
                value={german}
                onChange={(e) => setGerman(e.target.value)}
                placeholder="Bär"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">
                Student Display Preview
              </label>
              <div className="mt-1 flex h-[38px] items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900">
                {combinedPreview}
              </div>
            </div>
          </div>
        </div>

        {/* Translations & Pronunciation */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              English Meaning *
            </label>
            <input
              type="text"
              required
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="Bear"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Bangla Meaning (বাংলা) *
            </label>
            <input
              type="text"
              required
              value={bangla}
              onChange={(e) => setBangla(e.target.value)}
              placeholder="ভালুক"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Bangla Pronunciation
            </label>
            <input
              type="text"
              value={pronunciationBangla}
              onChange={(e) => setPronunciationBangla(e.target.value)}
              placeholder="বেয়ার"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              German Plural
            </label>
            <input
              type="text"
              value={pluralGerman}
              onChange={(e) => setPluralGerman(e.target.value)}
              placeholder="die Bären"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Examples */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              German Example Sentence
            </label>
            <input
              type="text"
              value={exampleGerman}
              onChange={(e) => setExampleGerman(e.target.value)}
              placeholder="Der Bär ist groß."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              English Example Meaning
            </label>
            <input
              type="text"
              value={exampleEnglish}
              onChange={(e) => setExampleEnglish(e.target.value)}
              placeholder="The bear is big."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Bangla Example Meaning
            </label>
            <input
              type="text"
              value={exampleBangla}
              onChange={(e) => setExampleBangla(e.target.value)}
              placeholder="ভালুকটি বড়।"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Media Selection with Cloudflare R2 Picker */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 pt-2 border-t border-slate-100">
          
          {/* Image Upload/Picker */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-3">Vocabulary Image</label>
            <div className="flex gap-4 items-start">
              {imageUrl ? (
                <div className="relative shrink-0">
                  <img src={imageUrl} alt="preview" className="h-20 w-20 rounded-lg object-cover border border-slate-300 shadow-sm" />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-white shrink-0">
                  <ImageIcon className="h-6 w-6 text-slate-400" />
                </div>
              )}
              
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImageAssetId(''); // Reset ID if manual URL is entered
                  }}
                  placeholder="https://..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsImagePickerOpen(true)}
                    className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded font-medium shadow-sm hover:bg-indigo-500 transition-colors"
                  >
                    Select from Library
                  </button>
                  {imageUrl && (
                    <button 
                      type="button" 
                      onClick={() => { setImageUrl(''); setImageAssetId(''); }}
                      className="text-xs px-3 py-1.5 bg-white border border-rose-200 text-rose-600 rounded font-medium hover:bg-rose-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Audio Upload/Picker */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-3">Pronunciation Audio</label>
            <div className="flex gap-4 items-start">
              <div className="h-20 w-20 rounded-lg border-2 border-amber-200 bg-amber-50 flex flex-col items-center justify-center shrink-0">
                <FileAudio className={`h-6 w-6 ${audioUrl ? 'text-amber-500' : 'text-slate-300'}`} />
              </div>
              
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  value={audioUrl}
                  onChange={(e) => {
                    setAudioUrl(e.target.value);
                    setAudioAssetId('');
                  }}
                  placeholder="https://..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAudioPickerOpen(true)}
                    className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded font-medium shadow-sm hover:bg-amber-400 transition-colors"
                  >
                    Select Audio
                  </button>
                  {audioUrl && (
                    <button 
                      type="button" 
                      onClick={() => { setAudioUrl(''); setAudioAssetId(''); }}
                      className="text-xs px-3 py-1.5 bg-white border border-rose-200 text-rose-600 rounded font-medium hover:bg-rose-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
            {audioUrl && (
              <div className="mt-3">
                <audio controls src={audioUrl} className="h-8 w-full max-w-[240px]" />
              </div>
            )}
          </div>

        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as VocabularyDifficulty)
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {DIFFICULTIES.map((diff) => (
                <option key={diff} value={diff}>
                  {diff}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Workflow Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                const nextStatus = e.target.value as ContentStatus;
                setStatus(nextStatus);
                setIsPublished(nextStatus === 'PUBLISHED');
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end pb-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsPublished(checked);
                  setStatus(checked ? 'PUBLISHED' : 'DRAFT');
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              Published (`isPublished: true`)
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => router.push('/admin/vocabulary')}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || categories.length === 0}
            className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting
              ? 'Saving...'
              : mode === 'create'
              ? 'Create Vocabulary'
              : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Media Picker Modals */}
      {isImagePickerOpen && (
        <MediaPickerModal 
          appId={activeApp.id} 
          allowedTypes={['IMAGE']} 
          onSelect={(asset) => {
            setImageAssetId(asset.id);
            setImageUrl(asset.publicUrl || '');
            setIsImagePickerOpen(false);
          }} 
          onClose={() => setIsImagePickerOpen(false)} 
        />
      )}

      {isAudioPickerOpen && (
        <MediaPickerModal 
          appId={activeApp.id} 
          allowedTypes={['AUDIO']} 
          onSelect={(asset) => {
            setAudioAssetId(asset.id);
            setAudioUrl(asset.publicUrl || '');
            setIsAudioPickerOpen(false);
          }} 
          onClose={() => setIsAudioPickerOpen(false)} 
        />
      )}
    </>
  );
}