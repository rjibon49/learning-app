import { apiRequest } from './client';

export type MediaType = 'IMAGE' | 'AUDIO' | 'PDF' | 'VIDEO' | 'DOCUMENT';
export type MediaVisibility = 'PUBLIC' | 'PRIVATE';

export interface MediaAsset {
  id: string;
  appId?: string | null;
  type: MediaType;
  visibility: MediaVisibility;
  storageProvider: string;
  bucket?: string | null;
  objectKey: string;
  publicUrl?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  createdAt: string;
}

export async function getMediaAssets(appId?: string): Promise<MediaAsset[]> {
  const query = appId ? `?appId=${encodeURIComponent(appId)}` : '';
  const res = await apiRequest<MediaAsset[] | { data?: MediaAsset[] }>(`/media${query}`);
  return Array.isArray(res) ? res : res.data ?? [];
}

export async function uploadMedia(file: File, appId?: string, visibility: MediaVisibility = 'PUBLIC'): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append('file', file);
  if (appId) formData.append('appId', appId);
  formData.append('visibility', visibility);

  // Directly fetch to avoid apiRequest overwriting Content-Type boundary for FormData
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/media/upload`, {
    method: 'POST',
    body: formData,
    // Add auth headers if your apiRequest uses a specific token
    // headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });

  if (!res.ok) {
    throw new Error('Failed to upload file');
  }
  return res.json();
}

export async function deleteMediaAsset(id: string): Promise<void> {
  await apiRequest(`/media/${id}`, { method: 'DELETE' });
}