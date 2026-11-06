import { apiRequest } from './client';

export type SubscriptionPlatform = 'GOOGLE_PLAY' | 'APPLE_APP_STORE' | 'STRIPE' | 'MANUAL';
export type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'EXPIRED' | 'CANCELED' | 'GRACE_PERIOD';

export interface Subscription {
  id: string;
  userId: string;
  appId: string;
  platform: SubscriptionPlatform;
  provider: string;
  productId: string;
  externalId?: string | null;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt?: string | null;
  autoRenew: boolean;
  user?: { email: string };
  app?: { name: string };
}

export async function getSubscriptions(appId?: string): Promise<Subscription[]> {
  const query = appId ? `?appId=${encodeURIComponent(appId)}` : '';
  return apiRequest<Subscription[]>(`/subscriptions${query}`);
}

export async function deleteSubscription(id: string): Promise<void> {
  return apiRequest<void>(`/subscriptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}