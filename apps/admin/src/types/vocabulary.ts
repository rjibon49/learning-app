export type GermanArticle = 'der' | 'die' | 'das';

export type VocabularyDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type ContentStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface VocabularyCategory {
  id: string;
  appId: string;
  name: string;
  slug: string;
  germanName: string | null;
  banglaName: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVocabularyCategoryDto {
  appId: string;
  name: string;
  slug: string;
  germanName?: string;
  banglaName?: string;
  sortOrder: number;
}

export interface VocabularyItem {
  id: string;
  appId: string;
  lessonId?: string | null;
  categoryId: string;
  category?: VocabularyCategory | null;
  article: GermanArticle | null;
  german: string;
  english: string;
  bangla: string;
  pronunciationBangla?: string | null;
  pluralGerman?: string | null;
  exampleGerman?: string | null;
  exampleEnglish?: string | null;
  exampleBangla?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  difficulty: VocabularyDifficulty;
  status?: ContentStatus;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVocabularyDto {
  appId: string;
  categoryId: string;
  lessonId?: string | null;
  article?: GermanArticle | null;
  german: string;
  english: string;
  bangla: string;
  pronunciationBangla?: string;
  pluralGerman?: string;
  exampleGerman?: string;
  exampleEnglish?: string;
  exampleBangla?: string;
  imageUrl?: string;
  audioUrl?: string;
  difficulty: VocabularyDifficulty;
  status?: ContentStatus;
  isPublished: boolean;
}

export type UpdateVocabularyDto = Partial<CreateVocabularyDto>;

export interface VocabularyFilterParams {
  appId: string;
  categoryId?: string;
  published?: boolean;
}