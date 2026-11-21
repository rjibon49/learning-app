import { apiClient } from "./client";

type Page<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type Translation = {
  id?: string;
  meaning: string;
  language: { code: string; name?: string };
};

export type Example = {
  id: string;
  text: string;
  translationGroupId: string | null;
  language: { code: string };
};

type Media = { publicUrl: string | null } | null;

/** One word as the practice screens need it. */
export type PracticeWord = {
  id: string;
  term: string;
  pronunciation: string | null;
  grammar: Record<string, unknown> | null;
  translations: Translation[];
  examples: Example[];
  imageUrl: string | null;
  audioUrl: string | null;
};

export type Deck = {
  id: string;
  title: string;
  description: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  sortOrder: number;
  _count?: { items?: number };
};

type RawWord = {
  id: string;
  term: string;
  pronunciation?: string | null;
  grammar?: Record<string, unknown> | null;
  translations?: Translation[];
  examples?: Example[];
  imageAsset?: Media;
  audioAsset?: Media;
};

function toWord(raw: RawWord): PracticeWord {
  return {
    id: raw.id,
    term: raw.term,
    pronunciation: raw.pronunciation ?? null,
    grammar: raw.grammar ?? null,
    translations: raw.translations ?? [],
    examples: raw.examples ?? [],
    imageUrl: raw.imageAsset?.publicUrl ?? null,
    audioUrl: raw.audioAsset?.publicUrl ?? null,
  };
}

export async function fetchDecks(appId: string): Promise<Deck[]> {
  const res = await apiClient.get<Page<Deck>>("/flashcards/decks", {
    params: { appId, limit: 100 },
  });
  return [...res.data.data].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchDeckWords(deckId: string): Promise<PracticeWord[]> {
  const res = await apiClient.get<Page<{ id: string; sortOrder: number; vocabulary: RawWord }>>(
    `/flashcards/decks/${encodeURIComponent(deckId)}/items`,
    { params: { page: 1, limit: 100 } },
  );
  return res.data.data
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => toWord(item.vocabulary));
}

/** Words the spaced-repetition schedule says are due now. */
export async function fetchDueWords(limit = 20): Promise<{ words: PracticeWord[]; total: number }> {
  const res = await apiClient.get<Page<{ vocabulary: RawWord }>>("/learner/progress/vocabulary/due", {
    params: { page: 1, limit },
  });
  return {
    words: res.data.data.map((row) => toWord(row.vocabulary)),
    total: res.data.pagination.total,
  };
}

/** Words linked to one lesson (used to start reviewing after a lesson). */
export async function fetchLessonWords(appId: string, lessonId: string): Promise<PracticeWord[]> {
  const res = await apiClient.get<Page<RawWord>>("/vocabulary", {
    params: { appId, lessonId, limit: 50 },
  });
  return res.data.data.map(toWord);
}

/**
 * Self-rating buttons mapped to SM-2 recall quality (0–5).
 * The API schedules the next review from this.
 */
export const RATINGS = [
  { key: "again", label: "Again", quality: 1 },
  { key: "hard", label: "Hard", quality: 3 },
  { key: "good", label: "Good", quality: 4 },
  { key: "easy", label: "Easy", quality: 5 },
] as const;

export type RatingKey = (typeof RATINGS)[number]["key"];

export async function reviewWord(vocabularyId: string, quality: number): Promise<void> {
  await apiClient.post("/learner/progress/vocabulary/review", { vocabularyId, quality });
}
