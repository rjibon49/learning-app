import { ApiClientError, apiRequest } from './client';
import type {
  CreateVocabularyCategoryDto,
  CreateVocabularyDto,
  UpdateVocabularyDto,
  VocabularyCategory,
  VocabularyFilterParams,
  VocabularyItem,
} from '@/types/vocabulary';

function buildQuery(params: Record<string, string | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const queryString = search.toString();
  return queryString ? `?${queryString}` : '';
}

function unwrapArray<T>(payload: T[] | { data?: T[]; items?: T[] }): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
}

export async function getAdminVocabularyList(
  filtersOrAppId: VocabularyFilterParams | string
): Promise<VocabularyItem[]> {
  // Handle both string appId or filter object passed from components
  const filters: VocabularyFilterParams = 
    typeof filtersOrAppId === 'string' 
      ? { appId: filtersOrAppId } 
      : filtersOrAppId;

  const query = buildQuery({
    appId: filters.appId,
    categoryId: filters.categoryId,
    published: filters.published,
  });

  try {
    const res = await apiRequest<
      VocabularyItem[] | { data?: VocabularyItem[]; items?: VocabularyItem[] }
    >(`/vocabulary/admin${query}`, {
      method: 'GET',
    });
    return unwrapArray(res);
  } catch (error) {
    // Fallback to GET /api/vocabulary if /api/vocabulary/admin is not yet mounted in NestJS
    if (error instanceof ApiClientError && error.status === 404) {
      const fallbackRes = await apiRequest<
        VocabularyItem[] | { data?: VocabularyItem[]; items?: VocabularyItem[] }
      >(`/vocabulary${query}`, {
        method: 'GET',
      });
      return unwrapArray(fallbackRes);
    }
    throw error;
  }
}

export async function getVocabularyById(id: string): Promise<VocabularyItem> {
  return apiRequest<VocabularyItem>(`/vocabulary/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export async function createVocabulary(
  payload: CreateVocabularyDto
): Promise<VocabularyItem> {
  return apiRequest<VocabularyItem>('/vocabulary', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateVocabulary(
  id: string,
  payload: UpdateVocabularyDto
): Promise<VocabularyItem> {
  return apiRequest<VocabularyItem>(`/vocabulary/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteVocabulary(id: string): Promise<void> {
  return apiRequest<void>(`/vocabulary/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function getVocabularyCategories(
  appId?: string
): Promise<VocabularyCategory[]> {
  const query = buildQuery({ appId });
  const res = await apiRequest<
    VocabularyCategory[] | { data?: VocabularyCategory[]; items?: VocabularyCategory[] }
  >(`/vocabulary/categories${query}`, {
    method: 'GET',
  });
  return unwrapArray(res);
}

export async function createVocabularyCategory(
  payload: CreateVocabularyCategoryDto
): Promise<VocabularyCategory> {
  return apiRequest<VocabularyCategory>('/vocabulary/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateVocabularyCategory(
  id: string,
  payload: Partial<CreateVocabularyCategoryDto>
): Promise<VocabularyCategory> {
  return apiRequest<VocabularyCategory>(`/vocabulary/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteVocabularyCategory(id: string): Promise<void> {
  return apiRequest<void>(`/vocabulary/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}