
import { apiRequest } from "@/lib/api/client";

export type VocabularyDifficulty = "EASY" | "MEDIUM" | "HARD";

export type VocabularyStatus =
  | "DRAFT"
  | "REVIEW"
  | "PUBLISHED"
  | "ARCHIVED";

export type GrammarValue =
  | string
  | number
  | boolean
  | null
  | string[];

export type VocabularyGrammar = Record<string, GrammarValue>;

export interface GlobalVocabularyCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  translations?: Array<{
    languageId: string;
    name: string;
    description?: string | null;
    language?: { code: string };
  }>;
  _count?: { vocabulary: number };
}

export interface VocabularyTranslation {
  id: string;
  languageId: string;
  meaning: string;
  notes: string | null;
  sortOrder: number;
  language?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface VocabularyExample {
  id: string;
  languageId: string;
  text: string;
  translationGroupId: string | null;
  sortOrder: number;
  language?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface GlobalVocabularyItem {
  id: string;
  languageId: string;
  term: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  grammar: VocabularyGrammar | null;
  difficulty: VocabularyDifficulty;
  status: VocabularyStatus;
  isPublished: boolean;
  notes: string | null;
  categoryId: string | null;
  lessonId: string | null;
  imageAssetId: string | null;
  audioAssetId: string | null;
  language?: {
    id: string;
    code: string;
    name: string;
  };
  category?: GlobalVocabularyCategory | null;
  lesson?: { id: string; title: string } | null;
  translations?: VocabularyTranslation[];
  examples?: VocabularyExample[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VocabularyInput {
  languageId: string;
  term: string;
  pronunciation?: string | null;
  partOfSpeech?: string | null;
  grammar?: VocabularyGrammar | null;
  difficulty?: VocabularyDifficulty;
  status?: VocabularyStatus;
  notes?: string | null;
  categoryId?: string | null;
  lessonId?: string | null;
  imageAssetId?: string | null;
  audioAssetId?: string | null;
}

export type VocabularyUpdateInput =
  Partial<Omit<VocabularyInput, "languageId">>;

export interface VocabularyListQuery {
  appId?: string;
  languageId?: string;
  lessonId?: string;
  categoryId?: string;
  search?: string;
  difficulty?: VocabularyDifficulty;
  status?: VocabularyStatus;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedVocabulary {
  data: GlobalVocabularyItem[];
  pagination: PaginationMeta;
}

export interface TranslationInput {
  languageId: string;
  meaning: string;
  notes?: string | null;
  sortOrder?: number;
}

export interface ExampleInput {
  languageId: string;
  text: string;
  translationGroupId?: string | null;
  sortOrder?: number;
}

export interface CategoryInput {
  name: string;
  slug: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

function idPath(id: string): string {
  return encodeURIComponent(id);
}

function buildQuery(
  values: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

// ========================================
// VOCABULARY LISTING
// ========================================

export function listGlobalVocabulary(
  query: VocabularyListQuery = {},
): Promise<PaginatedVocabulary> {
  const params = buildQuery({
    appId: query.appId,
    languageId: query.languageId,
    lessonId: query.lessonId,
    categoryId: query.categoryId,
    search: query.search,
    difficulty: query.difficulty,
    status: query.status,
    page: query.page ?? 1,
    limit: query.limit ?? 10,
  });

  return apiRequest<PaginatedVocabulary>(
    `/admin/vocabulary?${params}`,
  );
}

export function getGlobalVocabulary(
  id: string,
): Promise<GlobalVocabularyItem> {
  return apiRequest<GlobalVocabularyItem>(
    `/admin/vocabulary/${idPath(id)}`,
  );
}

export function createGlobalVocabulary(
  data: VocabularyInput,
): Promise<GlobalVocabularyItem> {
  return apiRequest<GlobalVocabularyItem>(
    "/admin/vocabulary",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function updateGlobalVocabulary(
  id: string,
  data: VocabularyUpdateInput,
): Promise<GlobalVocabularyItem> {
  return apiRequest<GlobalVocabularyItem>(
    `/admin/vocabulary/${idPath(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export function archiveGlobalVocabulary(
  id: string,
): Promise<GlobalVocabularyItem> {
  return apiRequest<GlobalVocabularyItem>(
    `/admin/vocabulary/${idPath(id)}`,
    { method: "DELETE" },
  );
}

// ========================================
// VOCABULARY TRANSLATIONS
// ========================================

export function addVocabularyTranslation(
  vocabularyId: string,
  data: TranslationInput,
): Promise<VocabularyTranslation> {
  return apiRequest<VocabularyTranslation>(
    `/admin/vocabulary/${idPath(vocabularyId)}/translations`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function updateVocabularyTranslation(
  vocabularyId: string,
  translationId: string,
  data: TranslationInput,
): Promise<VocabularyTranslation> {
  return apiRequest<VocabularyTranslation>(
    `/admin/vocabulary/${idPath(vocabularyId)}/translations/${idPath(translationId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export function deleteVocabularyTranslation(
  vocabularyId: string,
  translationId: string,
): Promise<{ success: boolean }> {
  return apiRequest(
    `/admin/vocabulary/${idPath(vocabularyId)}/translations/${idPath(translationId)}`,
    { method: "DELETE" },
  );
}

// ========================================
// EXAMPLE SENTENCES
// ========================================

export function addVocabularyExample(
  vocabularyId: string,
  data: ExampleInput,
): Promise<VocabularyExample> {
  return apiRequest<VocabularyExample>(
    `/admin/vocabulary/${idPath(vocabularyId)}/examples`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function updateVocabularyExample(
  vocabularyId: string,
  exampleId: string,
  data: Partial<ExampleInput>,
): Promise<VocabularyExample> {
  return apiRequest<VocabularyExample>(
    `/admin/vocabulary/${idPath(vocabularyId)}/examples/${idPath(exampleId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export function deleteVocabularyExample(
  vocabularyId: string,
  exampleId: string,
): Promise<{ success: boolean }> {
  return apiRequest(
    `/admin/vocabulary/${idPath(vocabularyId)}/examples/${idPath(exampleId)}`,
    { method: "DELETE" },
  );
}

// ========================================
// GLOBAL VOCABULARY CATEGORIES
// ========================================

export function getGlobalCategories():
  Promise<GlobalVocabularyCategory[]> {
  return apiRequest("/admin/vocabulary/categories");
}

export function createGlobalCategory(
  data: CategoryInput,
): Promise<GlobalVocabularyCategory> {
  return apiRequest("/admin/vocabulary/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateGlobalCategory(
  id: string,
  data: Partial<CategoryInput>,
): Promise<GlobalVocabularyCategory> {
  return apiRequest(
    `/admin/vocabulary/categories/${idPath(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export function archiveGlobalCategory(
  id: string,
): Promise<GlobalVocabularyCategory> {
  return apiRequest(
    `/admin/vocabulary/categories/${idPath(id)}`,
    { method: "DELETE" },
  );
}

export function saveGlobalCategoryTranslation(
  categoryId: string,
  data: {
    languageId: string;
    name: string;
    description?: string | null;
  },
) {
  return apiRequest(
    `/admin/vocabulary/categories/${idPath(categoryId)}/translations`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function removeGlobalCategoryTranslation(
  categoryId: string,
  languageId: string,
) {
  return apiRequest(
    `/admin/vocabulary/categories/${idPath(categoryId)}/translations/${idPath(languageId)}`,
    { method: "DELETE" },
  );
}
