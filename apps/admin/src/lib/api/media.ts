
import { apiRequest } from "@/lib/api/client";

export type MediaType =
  | "IMAGE"
  | "AUDIO"
  | "PDF"
  | "VIDEO"
  | "DOCUMENT";

export type MediaVisibility = "PUBLIC" | "PRIVATE";

export type MediaProcessingStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY"
  | "FAILED";

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

export interface MediaPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MediaListResponse {
  data: MediaAsset[];
  pagination: MediaPagination;
}

export interface MediaAccessResponse {
  url: string;
  expiresIn: number;
}

export async function getMediaPage(
  options: {
    appId?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<MediaListResponse> {
  const params = new URLSearchParams();

  if (options.appId) {
    params.set("appId", options.appId);
  }

  params.set("page", String(options.page ?? 1));
  params.set("limit", String(options.limit ?? 20));

  return apiRequest<MediaListResponse>(
    `/media?${params.toString()}`,
    { method: "GET" },
  );
}

// Backward-compatible with Vocabulary and Quiz pickers.
export async function getMediaAssets(
  appId?: string,
  page = 1,
  limit = 20,
): Promise<MediaAsset[]> {
  const response = await getMediaPage({
    appId,
    page,
    limit,
  });

  return response.data;
}

export async function uploadMedia(
  file: File,
  appId?: string,
  visibility: MediaVisibility = "PRIVATE",
): Promise<MediaAsset> {
  const form = new FormData();

  form.append("file", file);

  if (appId) {
    form.append("appId", appId);
  }

  form.append("visibility", visibility);

  // Never set Content-Type manually for FormData.
  return apiRequest<MediaAsset>("/media/upload", {
    method: "POST",
    body: form,
  });
}

export function getMediaAccess(
  id: string,
): Promise<MediaAccessResponse> {
  return apiRequest<MediaAccessResponse>(
    `/media/${encodeURIComponent(id)}/access`,
  );
}

export async function deleteMediaAsset(
  id: string,
): Promise<void> {
  await apiRequest(
    `/media/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export function getPublicMediaUrl(
  asset: MediaAsset,
): string | null {
  if (
    asset.visibility !== "PUBLIC" ||
    asset.status !== "READY"
  ) {
    return null;
  }

  return asset.publicUrl;
}
