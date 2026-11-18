import { apiRequest } from './client';

export type SubscriptionPlatform = string;
export type SubscriptionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'TRIAL'
  | 'REFUNDED';

export interface Subscription {
  id: string;
  userId: string;
  appId: string;
  platform: SubscriptionPlatform;
  provider: string;
  productId: string;
  externalId?: string | null;
  status: SubscriptionStatus;
  startedAt?: string | null;
  expiresAt?: string | null;
  autoRenew: boolean;
  cancelAtPeriodEnd?: boolean;
  user?: { id: string; email: string | null; displayName?: string | null };
  app?: { id: string; name: string };
}

export interface SubscriptionPage {
  data: Subscription[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Admin list: GET /admin/subscriptions (paginated).
 * Subscriptions are billing records and have no delete route on purpose;
 * cancellations and refunds have their own pages.
 */
export async function getSubscriptions(params: {
  appId?: string;
  status?: SubscriptionStatus;
  page?: number;
  limit?: number;
} = {}): Promise<SubscriptionPage> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  });
  if (params.appId) query.set('appId', params.appId);
  if (params.status) query.set('status', params.status);
  return apiRequest<SubscriptionPage>(`/admin/subscriptions?${query.toString()}`);
}
