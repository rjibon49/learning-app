
import { apiRequest } from './client';

export type DocumentJobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface DocumentUploadResult {
  sourceAssetId: string;
  jobId: string;
  status: DocumentJobStatus;
  message: string;
}

export interface DocumentJob {
  id: string;
  appId: string | null;
  type: string;
  status: DocumentJobStatus;

  entityType: string | null;
  entityId: string | null;

  attempts: number;
  maxAttempts: number;

  errorMessage: string | null;

  result: {
    sourceAssetId?: string;
    pdfAssetId?: string;
    pageCount?: number;
  } | null;

  createdAt: string;
  completedAt: string | null;
}

export interface DocumentJobsResponse {
  data: DocumentJob[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function uploadOfficeDocument(
  file: File,
  appId?: string,
  visibility: 'PUBLIC' | 'PRIVATE' = 'PRIVATE',
): Promise<DocumentUploadResult> {
  const allowedExtensions = [
    '.docx',
    '.pptx',
    '.xlsx',
  ];

  const filename = file.name.toLowerCase();

  if (
    !allowedExtensions.some(
      (extension) => filename.endsWith(extension),
    )
  ) {
    throw new Error(
      'Only DOCX, PPTX and XLSX are supported',
    );
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Maximum file size is 20 MB');
  }

  const formData = new FormData();

  formData.append('file', file);
  formData.append('visibility', visibility);

  if (appId) {
    formData.append('appId', appId);
  }

  return apiRequest<DocumentUploadResult>(
    '/admin/documents/upload',
    {
      method: 'POST',
      body: formData,
    },
  );
}

export async function getDocumentJob(
  jobId: string,
): Promise<DocumentJob> {
  return apiRequest<DocumentJob>(
    `/admin/documents/jobs/${encodeURIComponent(jobId)}`,
  );
}

export async function getDocumentJobs(
  page = 1,
  limit = 20,
  status?: DocumentJobStatus,
): Promise<DocumentJobsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status) {
    params.set('status', status);
  }

  return apiRequest<DocumentJobsResponse>(
    `/admin/documents/jobs?${params.toString()}`,
  );
}

export async function getConvertedPdfAccess(
  pdfAssetId: string,
): Promise<{ url: string; expiresIn: number }> {
  return apiRequest(
    `/media/${encodeURIComponent(pdfAssetId)}/access`,
  );
}
