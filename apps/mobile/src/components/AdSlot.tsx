import { fetchEntitlement } from "../api/ads";
import { useAsync } from "../lib/use-async";

/** True when this learner should see ads (ads on in the CMS, not ad-free). */
export function useAdsAllowed(appId: string): boolean {
  const state = useAsync(() => fetchEntitlement(appId), [appId]);
  const e = state.data;
  return Boolean(e && e.adsEnabled && !e.adFree);
}

/**
 * Place where a banner ad goes. The AdMob banner is added together with the
 * AdMob SDK (needs a development build and the unit ids from CMS → Ads);
 * until then this renders nothing.
 */
export function AdSlot({ appId }: { appId: string }) {
  const allowed = useAdsAllowed(appId);
  if (!allowed) return null;
  return null;
}
