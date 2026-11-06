import { apiRequest } from './client';

export interface FlashcardDeck {
  id: string;
  appId: string;
  title: string;
  description?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isPublished: boolean;
  sortOrder: number;
  _count?: { items: number };
}

export interface FlashcardDeckItem {
  id: string;
  deckId: string;
  vocabularyId: string;
  sortOrder: number;
  vocabulary: {
    id: string;
    german: string;
    english: string;
    bangla: string;
    article?: string | null;
    imageUrl?: string | null;
  };
}

export async function getDecks(appId?: string): Promise<FlashcardDeck[]> {
  const query = appId ? `?appId=${encodeURIComponent(appId)}` : '';
  return apiRequest<FlashcardDeck[]>(`/flashcards/decks${query}`);
}

export async function createDeck(payload: Partial<FlashcardDeck>): Promise<FlashcardDeck> {
  return apiRequest<FlashcardDeck>('/flashcards/decks', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateDeck(id: string, payload: Partial<FlashcardDeck>): Promise<FlashcardDeck> {
  return apiRequest<FlashcardDeck>(`/flashcards/decks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteDeck(id: string): Promise<void> {
  return apiRequest<void>(`/flashcards/decks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getDeckItems(deckId: string): Promise<FlashcardDeckItem[]> {
  return apiRequest<FlashcardDeckItem[]>(`/flashcards/decks/${encodeURIComponent(deckId)}/items`);
}

export async function addDeckItems(deckId: string, vocabularyIds: string[]): Promise<FlashcardDeckItem[]> {
  return apiRequest<FlashcardDeckItem[]>(`/flashcards/decks/${encodeURIComponent(deckId)}/items`, {
    method: 'POST',
    body: JSON.stringify({ vocabularyIds }),
  });
}

export async function removeDeckItem(itemId: string): Promise<void> {
  return apiRequest<void>(`/flashcards/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}