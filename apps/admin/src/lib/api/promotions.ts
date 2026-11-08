import { apiRequest } from './client';

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
}

export async function getPromoCodes(): Promise<PromoCode[]> {
  return apiRequest<PromoCode[]>('/promotions/admin/codes');
}

export async function createPromoCode(data: Partial<PromoCode>): Promise<PromoCode> {
  return apiRequest<PromoCode>('/promotions/admin/codes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode> {
  return apiRequest<PromoCode>(`/promotions/admin/codes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function togglePromoCodeStatus(id: string, isActive: boolean): Promise<PromoCode> {
  return apiRequest<PromoCode>(`/promotions/admin/codes/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function deletePromoCode(id: string): Promise<void> {
  return apiRequest<void>(`/promotions/admin/codes/${id}`, {
    method: 'DELETE',
  });
}