
import { apiRequest } from "@/lib/api/client";

export type AdProvider = "ADMOB" | "OTHER";
export type AdPlatform = "android" | "ios";

export interface AdConfig {
  id: string;
  appId: string;
  provider: AdProvider;
  platform: string;
  appAdId: string | null;
  bannerAdUnitId: string | null;
  interstitialAdUnitId: string | null;
  rewardedAdUnitId: string | null;
  nativeAdUnitId: string | null;
  isEnabled: boolean;
  settings?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  app?: { id?: string; name: string };
}

export type AdConfigInput = {
  appId: string;
  provider: AdProvider;
  platform: AdPlatform;
  appAdId?: string | null;
  bannerAdUnitId?: string | null;
  interstitialAdUnitId?: string | null;
  rewardedAdUnitId?: string | null;
  nativeAdUnitId?: string | null;
  isEnabled: boolean;
};

export type UpdateAdConfigInput =
  Partial<Omit<AdConfigInput, "appId">>;

export interface AdsQuery {
  appId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface AdsPage {
  data: AdConfig[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function buildQuery(query: AdsQuery): string {
  const params = new URLSearchParams();

  if (query.appId) {
    params.set("appId", query.appId);
  }

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  return params.toString();
}

function normalizePage(
  result: AdsPage | AdConfig[],
  query: AdsQuery,
): AdsPage {
  if (!Array.isArray(result)) {
    return result;
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  return {
    data: result,
    pagination: {
      page,
      limit,
      total: result.length,
      totalPages: Math.max(
        1,
        Math.ceil(result.length / limit),
      ),
    },
  };
}

export async function getAdsConfigsPage(
  query: AdsQuery = {},
): Promise<AdsPage> {
  const result = await apiRequest<AdsPage | AdConfig[]>(
    `/admin/ads?${buildQuery(query)}`,
  );

  return normalizePage(result, query);
}

// Kept for compatibility with earlier CMS imports.
export async function getAdsConfigs(
  appId?: string,
): Promise<AdConfig[]> {
  const results: AdConfig[] = [];
  let page = 1;

  while (page <= 100) {
    const response = await getAdsConfigsPage({
      appId,
      page,
      limit: 100,
    });

    results.push(...response.data);

    if (page >= response.pagination.totalPages) {
      break;
    }

    page += 1;
  }

  return results;
}

export function getAdConfig(
  id: string,
): Promise<AdConfig> {
  return apiRequest<AdConfig>(
    `/admin/ads/${encodeURIComponent(id)}`,
  );
}

export function createAdConfig(
  payload: AdConfigInput,
): Promise<AdConfig> {
  return apiRequest<AdConfig>(
    "/admin/ads",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateAdConfig(
  id: string,
  payload: UpdateAdConfigInput,
): Promise<AdConfig> {
  return apiRequest<AdConfig>(
    `/admin/ads/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteAdConfig(
  id: string,
): Promise<void> {
  await apiRequest(
    `/admin/ads/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
