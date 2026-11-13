
import { apiRequest } from "@/lib/api/client";

import type {
  Difficulty,
  Paginated,
} from "@/lib/api/quizzes";

export interface FlashcardDeck {
  id: string;
  appId: string;
  title: string;
  description: string | null;
  difficulty: Difficulty;
  isPublished: boolean;
  sortOrder: number;
  app?: {
    name: string;
    language?: { code: string; name: string };
  };
  _count?: { items: number };
}

export interface FlashcardDeckItem {
  id: string;
  deckId: string;
  vocabularyId: string;
  sortOrder: number;
  vocabulary: {
    id: string;
    term: string;
    pronunciation?: string | null;
    partOfSpeech?: string | null;
    grammar?: Record<string, unknown> | null;
    translations?: Array<{
      id: string;
      meaning: string;
      language?: {
        code: string;
        name: string;
      };
    }>;
  };
}

export interface DeckInput {
  appId: string;
  title: string;
  description?: string | null;
  difficulty?: Difficulty;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface DeckQuery {
  appId?: string;
  search?: string;
  difficulty?: Difficulty;
  page?: number;
  limit?: number;
}

function encode(value: string) {
  return encodeURIComponent(value);
}

function buildQuery(values: Record<string, unknown>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

export function getDecksPage(
  query: DeckQuery = {},
): Promise<Paginated<FlashcardDeck>> {
  return apiRequest(
    `/admin/flashcards/decks?${buildQuery({
      page: 1,
      limit: 10,
      ...query,
    })}`,
  );
}

export async function getDecks(
  appId?: string,
): Promise<FlashcardDeck[]> {
  const result = await getDecksPage({
    appId,
    page: 1,
    limit: 100,
  });
  return result.data;
}

export function getDeck(
  deckId: string,
): Promise<FlashcardDeck> {
  return apiRequest(
    `/admin/flashcards/decks/${encode(deckId)}`,
  );
}

export function createDeck(
  input: DeckInput,
): Promise<FlashcardDeck> {
  return apiRequest("/admin/flashcards/decks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDeck(
  deckId: string,
  input: Partial<Omit<DeckInput, "appId">>,
): Promise<FlashcardDeck> {
  return apiRequest(
    `/admin/flashcards/decks/${encode(deckId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function deleteDeck(
  deckId: string,
): Promise<FlashcardDeck> {
  return apiRequest(
    `/admin/flashcards/decks/${encode(deckId)}`,
    { method: "DELETE" },
  );
}

export function getDeckItemsPage(
  deckId: string,
  page = 1,
  limit = 20,
): Promise<Paginated<FlashcardDeckItem>> {
  return apiRequest(
    `/admin/flashcards/decks/${encode(deckId)}/items?page=${page}&limit=${limit}`,
  );
}

export async function getDeckItems(
  deckId: string,
): Promise<FlashcardDeckItem[]> {
  const result = await getDeckItemsPage(
    deckId,
    1,
    100,
  );
  return result.data;
}

export function addDeckItems(
  deckId: string,
  vocabularyIds: string[],
): Promise<unknown> {
  return apiRequest(
    `/admin/flashcards/decks/${encode(deckId)}/items`,
    {
      method: "POST",
      body: JSON.stringify({ vocabularyIds }),
    },
  );
}

export function removeDeckItem(
  deckId: string,
  itemId: string,
): Promise<unknown> {
  return apiRequest(
    `/admin/flashcards/decks/${encode(deckId)}/items/${encode(itemId)}`,
    { method: "DELETE" },
  );
}
