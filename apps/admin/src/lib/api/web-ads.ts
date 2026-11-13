
import { apiRequest } from "@/lib/api/client";

export type WebAdKind =
  | "LOCAL_IMAGE"
  | "ADSENSE"
  | "GAM";

export type WebAdStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "ARCHIVED";

export interface WebAdPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  pagination: WebAdPagination;
}

export interface WebAdPlacement {
  id: string;
  siteKey: string;
  key: string;
  name: string;
  width: number | null;
  height: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { campaigns: number };
}

export interface WebAdCampaign {
  id: string;
  placementId: string;
  name: string;
  kind: WebAdKind;
  status: WebAdStatus;
  mediaAssetId: string | null;
  destinationUrl: string | null;
  altText: string | null;
  providerClient: string | null;
  providerSlot: string | null;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  weight: number;
  languageCode: string | null;
  pagePrefix: string | null;
  createdAt: string;
  updatedAt: string;
  placement?: WebAdPlacement;
  _count?: { events: number };
}

export interface PlacementInput {
  siteKey: string;
  key: string;
  name: string;
  width?: number | null;
  height?: number | null;
  isActive: boolean;
}

export type PlacementUpdate =
  Partial<Omit<PlacementInput, "siteKey" | "key">>;

export interface CampaignInput {
  placementId: string;
  name: string;
  kind: WebAdKind;
  status: "DRAFT" | "ACTIVE" | "PAUSED";
  mediaAssetId?: string | null;
  destinationUrl?: string | null;
  altText?: string | null;
  providerClient?: string | null;
  providerSlot?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  priority: number;
  weight: number;
  languageCode?: string | null;
  pagePrefix?: string | null;
}

export type CampaignUpdate =
  Partial<Omit<CampaignInput, "placementId">>;

export interface WebAdReportRow {
  id: string;
  name: string;
  kind: WebAdKind;
  status: WebAdStatus;
  placement: { key: string };
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface WebAdReport {
  siteKey: string;
  days: number;
  rows: WebAdReportRow[];
  totals: {
    impressions: number;
    clicks: number;
  };
}

export interface DeliveryResponse {
  filled: boolean;
  campaignId?: string;
  kind?: WebAdKind;
  token?: string;
  placement?: {
    key: string;
    width: number | null;
    height: number | null;
  };
  creative?: {
    imageUrl?: string | null;
    altText?: string;
    providerClient?: string | null;
    providerSlot?: string | null;
  };
}

type ListParams = {
  siteKey?: string;
  placementId?: string;
  page?: number;
  limit?: number;
};

function queryString(
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

function encoded(id: string): string {
  return encodeURIComponent(id);
}

export function getWebPlacements(
  params: ListParams = {},
): Promise<Paged<WebAdPlacement>> {
  return apiRequest(
    `/admin/web-ads/placements?${queryString({
      siteKey: params.siteKey,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    })}`,
  );
}

export async function getAllWebPlacements(
  siteKey: string,
): Promise<WebAdPlacement[]> {
  const results: WebAdPlacement[] = [];

  for (let page = 1; page <= 100; page++) {
    const response = await getWebPlacements({
      siteKey,
      page,
      limit: 100,
    });

    results.push(...response.data);

    if (page >= response.pagination.totalPages) {
      break;
    }
  }

  return results;
}

export function createWebPlacement(
  input: PlacementInput,
): Promise<WebAdPlacement> {
  return apiRequest("/admin/web-ads/placements", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWebPlacement(
  id: string,
  input: PlacementUpdate,
): Promise<WebAdPlacement> {
  return apiRequest(
    `/admin/web-ads/placements/${encoded(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function disableWebPlacement(
  id: string,
): Promise<WebAdPlacement> {
  return apiRequest(
    `/admin/web-ads/placements/${encoded(id)}`,
    { method: "DELETE" },
  );
}

export function getWebCampaigns(
  params: ListParams = {},
): Promise<Paged<WebAdCampaign>> {
  return apiRequest(
    `/admin/web-ads/campaigns?${queryString({
      siteKey: params.siteKey,
      placementId: params.placementId,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    })}`,
  );
}

export function getWebCampaign(
  id: string,
): Promise<WebAdCampaign> {
  return apiRequest(
    `/admin/web-ads/campaigns/${encoded(id)}`,
  );
}

export function createWebCampaign(
  input: CampaignInput,
): Promise<WebAdCampaign> {
  return apiRequest("/admin/web-ads/campaigns", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWebCampaign(
  id: string,
  input: CampaignUpdate,
): Promise<WebAdCampaign> {
  return apiRequest(
    `/admin/web-ads/campaigns/${encoded(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function archiveWebCampaign(
  id: string,
): Promise<WebAdCampaign> {
  return apiRequest(
    `/admin/web-ads/campaigns/${encoded(id)}`,
    { method: "DELETE" },
  );
}

export function getWebAdsReport(
  siteKey: string,
  days = 30,
): Promise<WebAdReport> {
  return apiRequest(
    `/admin/web-ads/report?${queryString({
      siteKey,
      days,
    })}`,
  );
}

export function getWebAdDelivery(
  siteKey: string,
  placementKey: string,
  pagePath = "/",
  languageCode?: string,
): Promise<DeliveryResponse> {
  return apiRequest(
    `/web-ads/delivery?${queryString({
      siteKey,
      placementKey,
      pagePath,
      languageCode,
    })}`,
  );
}
