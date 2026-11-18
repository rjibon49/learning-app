import { Platform } from "react-native";

import { apiClient } from "./client";

export type Entitlement = {
  adFree: boolean;
  adFreeUntil: string | null;
  subscriptionActive: boolean;
  subscriptionsEnabled: boolean;
  adsEnabled: boolean;
};

export type Plan = {
  planType: "MONTHLY" | "YEARLY";
  productId: string;
  amountMinor: number;
  currency: string;
};

export type AdUnits = {
  adsEnabled: boolean;
  configurations: {
    id: string;
    provider: string;
    bannerAdUnitId: string | null;
    interstitialAdUnitId: string | null;
    rewardedAdUnitId: string | null;
  }[];
};

export async function fetchEntitlement(appId: string): Promise<Entitlement> {
  const res = await apiClient.get<Entitlement>(`/subscriptions/entitlements/${encodeURIComponent(appId)}`);
  return res.data;
}

/** Prices from the CMS. Null when pricing is not set up yet. */
export async function fetchPlans(): Promise<Plan[] | null> {
  try {
    const res = await apiClient.get<Plan[]>("/subscriptions/plans");
    return res.data;
  } catch {
    return null;
  }
}

/** AdMob unit ids for this app and platform (empty when the learner is ad-free). */
export async function fetchAdUnits(appId: string): Promise<AdUnits> {
  const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
  const res = await apiClient.get<AdUnits>("/ads/learner/config", { params: { appId, platform } });
  return res.data;
}

export function formatPrice(plan: Plan): string {
  const amount = plan.amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: plan.currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${plan.currency}`;
  }
}
