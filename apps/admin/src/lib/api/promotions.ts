
import { apiRequest } from "@/lib/api/client";

export interface PromoCode {
  id: string;
  code: string;
  discountPct: number;
  description: string | null;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  maxUses: number | null;
  currentUses: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PromoCodeInput {
  code: string;
  discountPct: number;
  description?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  maxUses?: number | null;
  isActive?: boolean;
}

export type PromoCodeUpdate =
  Partial<PromoCodeInput>;

export interface PromoPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PromoCodePage {
  data: PromoCode[];
  pagination: PromoPagination;
}

export interface PromoQuery {
  page?: number;
  limit?: number;
}

const BASE = "/admin/promotions/codes";

export function getPromoCodesPage(
  query: PromoQuery = {},
): Promise<PromoCodePage> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 10),
  });

  return apiRequest<PromoCodePage>(
    `${BASE}?${params.toString()}`,
  );
}

// Compatible helper for older CMS consumers.
export async function getPromoCodes():
  Promise<PromoCode[]> {
  const all: PromoCode[] = [];

  for (let page = 1; page <= 100; page++) {
    const result = await getPromoCodesPage({
      page,
      limit: 100,
    });

    all.push(...result.data);

    if (page >= result.pagination.totalPages) {
      break;
    }
  }

  return all;
}

export function createPromoCode(
  input: PromoCodeInput,
): Promise<PromoCode> {
  return apiRequest<PromoCode>(BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePromoCode(
  id: string,
  input: PromoCodeUpdate,
): Promise<PromoCode> {
  return apiRequest<PromoCode>(
    `${BASE}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function togglePromoCodeStatus(
  id: string,
  isActive: boolean,
): Promise<PromoCode> {
  return apiRequest<PromoCode>(
    `${BASE}/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
  );
}

// Current backend soft-disables the code.
export async function deletePromoCode(
  id: string,
): Promise<void> {
  await apiRequest(
    `${BASE}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
