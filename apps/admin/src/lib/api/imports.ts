
import { apiRequest } from "@/lib/api/client";

export interface ImportTranslation {
  languageCode: string;
  meaning: string;
  notes?: string | null;
}

export interface ImportExample {
  languageCode: string;
  text: string;
  translationGroupId?: string | null;
}

export interface ImportVocabularyItem {
  term: string;
  pronunciation?: string | null;
  partOfSpeech?: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  grammar?: Record<
    string,
    string | number | boolean | null | string[]
  > | null;
  categoryId?: string | null;
  lessonId?: string | null;
  notes?: string | null;
  translations: ImportTranslation[];
  examples: ImportExample[];
}

export interface ImportVocabularyPayload {
  appId: string;
  filename: string;
  items: ImportVocabularyItem[];
}

export interface QueuedImport {
  importId: string;
  backgroundJobId: string;
  status: "PENDING";
  totalRows: number;
  message: string;
}

export type ImportJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL";

export interface ImportJob {
  id: string;
  appId: string;
  filename: string;
  status: ImportJobStatus;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  errorReport?: unknown;
  createdAt: string;
  backgroundJob?: {
    id: string;
    status: string;
    attempts: number;
    maxAttempts: number;
    errorMessage?: string | null;
  } | null;
}

export interface ImportJobPage {
  data: ImportJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function bulkImportVocabulary(
  payload: ImportVocabularyPayload,
): Promise<QueuedImport> {
  if (
    payload.items.length < 1 ||
    payload.items.length > 100
  ) {
    throw new Error("Each import must contain 1–100 rows.");
  }

  return apiRequest<QueuedImport>("/imports/vocabulary", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getImportJobs(
  appId?: string,
  page = 1,
  limit = 10,
): Promise<ImportJobPage> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (appId) params.set("appId", appId);

  return apiRequest<ImportJobPage>(
    `/imports/jobs?${params.toString()}`,
  );
}

export function getImportJob(
  id: string,
): Promise<ImportJob> {
  return apiRequest<ImportJob>(
    `/imports/jobs/${encodeURIComponent(id)}`,
  );
}
