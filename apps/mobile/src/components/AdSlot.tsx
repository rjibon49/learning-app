import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { adsLib, initAds, useAdsState } from "../lib/ads";

/**
 * Banner ad (AdMob, anchored adaptive). Renders nothing when ads are off in
 * the CMS, the learner is ad-free, consent doesn't allow ads, in Expo Go, or
 * when no ad is available.
 */
export function AdSlot({ appId }: { appId: string }) {
  const { ready, units } = useAdsState();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void initAds(appId);
  }, [appId]);

  const ads = adsLib();
  if (!ads || !ready || !units.banner || failed) return null;

  const { BannerAd, BannerAdSize } = ads;
  return (
    <View style={styles.wrap} accessibilityLabel="Advertisement">
      <BannerAd
        unitId={units.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", overflow: "hidden" },
});
