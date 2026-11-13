
import { apiRequest } from "./client";

import type {
  LearningApp,
  AppFormInput,
  AppQuery,
  AppStatusInput,
  LearningLanguage,
  ProficiencyLevel,
} from "@/types/app";

import type {
  PaginatedResponse,
} from "@/types/pagination";

interface RawApp {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  isActive: boolean;
  languageId?: string;
  levelId?: string | null;
  language?: LearningLanguage | null;
  level?: ProficiencyLevel | null;
}

function normalizeApp(app: RawApp): LearningApp {
  const language = app.language ?? {
    id: app.languageId ?? "",
    code: "",
    name: "Unknown language",
    nativeName: "",
    direction: "LTR" as const,
  };

  return {
    id: app.id,
    name: app.name,
    slug: app.slug,
    description: app.description ?? null,
    iconUrl: app.iconUrl ?? null,
    primaryColor: app.primaryColor ?? null,
    secondaryColor: app.secondaryColor ?? null,
    isActive: app.isActive,
    languageId: app.languageId ?? language.id,
    levelId: app.levelId ?? app.level?.id ?? null,
    language,
    levelInfo: app.level ?? null,
    level: app.level?.code ?? "General",
  };
}

function toPaginated<T>(
  response: PaginatedResponse<T> | T[],
  page: number,
  limit: number,
): PaginatedResponse<T> {
  if (!Array.isArray(response)) {
    return response;
  }

  return {
    data: response,
    pagination: {
      page,
      limit,
      total: response.length,
      totalPages: Math.max(
        1,
        Math.ceil(response.length / limit),
      ),
    },
  };
}

function makeQuery(query: AppQuery): string {
  const params = new URLSearchParams();

  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.languageId) {
    params.set("languageId", query.languageId);
  }

  return params.toString();
}

export async function getAdminApps(
  query: AppQuery = {},
): Promise<PaginatedResponse<LearningApp>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const qs = makeQuery({ ...query, page, limit });

  const response = await apiRequest<
    PaginatedResponse<RawApp> | RawApp[]
  >(`/admin/apps?${qs}`, {
    method: "GET",
  });

  const paginated = toPaginated(response, page, limit);

  return {
    data: paginated.data.map(normalizeApp),
    pagination: paginated.pagination,
  };
}

// The existing CMS context needs the complete public
// app catalog rather than only the first page.
export async function getApps(): Promise<LearningApp[]> {
  const all: LearningApp[] = [];
  const limit = 100;

  for (let page = 1; page <= 100; page++) {
    const response = await apiRequest<
      PaginatedResponse<RawApp> | RawApp[]
    >(`/apps?page=${page}&limit=${limit}`, {
      method: "GET",
    });

    const result = toPaginated(response, page, limit);
    all.push(...result.data.map(normalizeApp));

    if (
      Array.isArray(response) ||
      result.data.length === 0 ||
      page >= result.pagination.totalPages
    ) {
      break;
    }
  }

  return all;
}

export async function getAppBySlug(
  slug: string,
): Promise<LearningApp> {
  const app = await apiRequest<RawApp>(
    `/apps/${encodeURIComponent(slug)}`,
    { method: "GET" },
  );

  return normalizeApp(app);
}

export async function getAdminApp(
  id: string,
): Promise<LearningApp> {
  const app = await apiRequest<RawApp>(
    `/admin/apps/${encodeURIComponent(id)}`,
    { method: "GET" },
  );

  return normalizeApp(app);
}

export async function createApp(
  input: AppFormInput,
): Promise<LearningApp> {
  const app = await apiRequest<RawApp>("/admin/apps", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return normalizeApp(app);
}

export async function updateApp(
  id: string,
  input: Partial<AppFormInput>,
): Promise<LearningApp> {
  const app = await apiRequest<RawApp>(
    `/admin/apps/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return normalizeApp(app);
}

export async function updateAppStatus(
  id: string,
  input: AppStatusInput,
): Promise<unknown> {
  return apiRequest(
    `/admin/apps/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}
