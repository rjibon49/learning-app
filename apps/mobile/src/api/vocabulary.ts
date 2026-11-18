import { isAxiosError } from "axios";

import { apiClient } from "./client";
import type { PracticeWord, Translation, Example } from "./practice";

type Media = { publicUrl: string | null } | null;

type RawWord = {
  id: string;
  term: string;
  pronunciation?: string | null;
  partOfSpeech?: string | null;
  grammar?: Record<string, unknown> | null;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  notes?: string | null;
  translations?: Translation[];
  examples?: Example[];
  category?: { id: string; name: string; slug: string } | null;
  imageAsset?: Media;
  audioAsset?: Media;
};

type Page<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

/** A word as the Words tab shows it (practice fields + list extras). */
export type WordEntry = PracticeWord & {
  partOfSpeech: string | null;
  notes: string | null;
  category: { id: string; name: string } | null;
};

function toEntry(raw: RawWord): WordEntry {
  return {
    id: raw.id,
    term: raw.term,
    pronunciation: raw.pronunciation ?? null,
    grammar: raw.grammar ?? null,
    translations: raw.translations ?? [],
    examples: raw.examples ?? [],
    imageUrl: raw.imageAsset?.publicUrl ?? null,
    audioUrl: raw.audioAsset?.publicUrl ?? null,
    partOfSpeech: raw.partOfSpeech ?? null,
    notes: raw.notes ?? null,
    category: raw.category ? { id: raw.category.id, name: raw.category.name } : null,
  };
}

const PAGE_SIZE = 100;
const MAX_PAGES = 30; // 3,000 words is far more than one CEFR level.

let cache: { appId: string; at: number; words: WordEntry[] } | null = null;
const CACHE_MS = 10 * 60 * 1000;

/**
 * Every published word used by this app (its lessons and its flashcard
 * decks), A–Z. Loaded once and searched/filtered on the phone, so typing in
 * the search box is instant and works with a weak connection.
 */
export async function fetchAppWords(appId: string, force = false): Promise<WordEntry[]> {
  if (!force && cache && cache.appId === appId && Date.now() - cache.at < CACHE_MS) {
    return cache.words;
  }

  const words: WordEntry[] = [];
  // Servers older than the `inApp` filter reject it (400): fall back to all
  // words of the app's language.
  let scoped = true;
  for (let page = 1; page <= MAX_PAGES; page++) {
    let res;
    try {
      res = await apiClient.get<Page<RawWord>>("/vocabulary", {
        params: { appId, ...(scoped ? { inApp: "true" } : {}), page, limit: PAGE_SIZE },
      });
    } catch (error) {
      if (scoped && page === 1 && isAxiosError(error) && error.response?.status === 400) {
        scoped = false;
        page = 0;
        continue;
      }
      throw error;
    }
    words.push(...res.data.data.map(toEntry));
    if (page >= res.data.pagination.totalPages) break;
  }

  cache = { appId, at: Date.now(), words };
  return words;
}

export async function fetchWord(id: string): Promise<WordEntry> {
  const cached = cache?.words.find((w) => w.id === id);
  if (cached) return cached;
  const res = await apiClient.get<RawWord>(`/vocabulary/${encodeURIComponent(id)}`);
  return toEntry(res.data);
}
