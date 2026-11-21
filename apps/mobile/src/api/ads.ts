import { Platform } from "react-native";

import { apiClient } from "./client";

/**
 * Ads for this learner: whether the app shows ads (CMS → Ads) and whether the
 * learner is ad-free for a while (e.g. a streak reward). The A1 app has no
 * paid subscription.
 */
export type Entitlement = {
  adFree: boolean;
  adFreeUntil: string | null;
  subscriptionActive: boolean;
  subscriptionsEnabled: boolean;
  adsEnabled: boolean;
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

/** AdMob unit ids for this app and platform (empty when the learner is ad-free). */
export async function fetchAdUnits(appId: string): Promise<AdUnits> {
  const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
  const res = await apiClient.get<AdUnits>("/ads/learner/config", { params: { appId, platform } });
  return res.data;
}
