import { apiRequest } from './client';

export type AdProvider = 'ADMOB' | 'FACEBOOK' | 'STARTAPP' | 'UNITY' | 'CUSTOM';

export interface AdConfig {
  id: string;
  appId: string;
  provider: AdProvider;
  platform: string;
  appAdId?: string | null;
  bannerAdUnitId?: string | null;
  interstitialAdUnitId?: string | null;
  rewardedAdUnitId?: string | null;
  nativeAdUnitId?: string | null;
  isEnabled: boolean;
  settings?: any | null;
  app?: { name: string };
}

export async function getAdsConfigs(appId?: string): Promise<AdConfig[]> {
  const query = appId ? `?appId=${encodeURIComponent(appId)}` : '';
  return apiRequest<AdConfig[]>(`/ads${query}`);
}

export async function createAdConfig(payload: any): Promise<AdConfig> {
  return apiRequest<AdConfig>('/ads', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAdConfig(id: string, payload: any): Promise<AdConfig> {
  return apiRequest<AdConfig>(`/ads/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteAdConfig(id: string): Promise<void> {
  return apiRequest<void>(`/ads/${encodeURIComponent(id)}`, { method: 'DELETE' });
}