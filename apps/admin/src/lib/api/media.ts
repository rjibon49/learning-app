
import { apiRequest } from './client';

export type MediaType =
  | 'IMAGE'
  | 'AUDIO'
  | 'PDF'
  | 'VIDEO'
  | 'DOCUMENT';

export type MediaVisibility =
  | 'PUBLIC'
  | 'PRIVATE';

export type MediaProcessingStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED';

export interface MediaAsset {
  id: string;
  appId: string | null;

  type: MediaType;
  visibility: MediaVisibility;
  status: MediaProcessingStatus;

  storageProvider: string;
  bucket: string | null;
  objectKey: string;

  publicUrl: string | null;

  originalName: string | null;
  originalMimeType: string | null;
  mimeType: string | null;

  fileSize: number | null;
  originalSize: number | null;

  width?: number | null;
  height?: number | null;
  pageCount?: number | null;

  optimizedFormat?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface MediaListResponse {
  data: MediaAsset[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getMediaAssets(
  appId?: string,
  page = 1,
  limit = 100,
): Promise<MediaAsset[]> {
  const params = new URLSearchParams();

  if (appId) {
    params.set('appId', appId);
  }

  params.set('page', String(page));
  params.set('limit', String(limit));

  const result =
    await apiRequest<MediaListResponse>(
      `/media?${params.toString()}`,
    );

  return result.data;
}

export async function uploadMedia(
  file: File,
  appId?: string,
  visibility: MediaVisibility = 'PRIVATE',
): Promise<MediaAsset> {
  const formData = new FormData();

  formData.append('file', file);

  if (appId) {
    formData.append('appId', appId);
  }

  formData.append('visibility', visibility);

  // apiRequest handles:
  // - Authorization Bearer JWT
  // - Admin token refresh
  // - API base URL
  // - Correct multipart Content-Type boundary
  return apiRequest<MediaAsset>(
    '/media/upload',
    {
      method: 'POST',
      body: formData,
    },
  );
}

export async function getMediaAccess(
  id: string,
): Promise<{
  url: string;
  expiresIn: number;
}> {
  return apiRequest(
    `/media/${encodeURIComponent(id)}/access`,
  );
}

export async function deleteMediaAsset(
  id: string,
): Promise<void> {
  await apiRequest(
    `/media/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
  );
}
