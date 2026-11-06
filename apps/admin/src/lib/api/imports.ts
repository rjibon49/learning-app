import { apiRequest } from './client';

export interface ImportVocabularyPayload {
  appId: string;
  categoryId?: string | null;
  items: Array<{
    german: string;
    english: string;
    bangla: string;
    article?: string;
    pluralGerman?: string;
    pronunciationBangla?: string;
  }>;
}

export async function bulkImportVocabulary(payload: ImportVocabularyPayload): Promise<{ success: boolean; importedCount: number }> {
  return apiRequest('/imports/vocabulary', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}