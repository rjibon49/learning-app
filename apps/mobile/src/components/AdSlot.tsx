import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { fetchEntitlement } from "../api/premium";
import { useAsync } from "../lib/use-async";
import { COLORS, RADIUS, SPACING } from "../styles/theme";
import { Txt } from "./ui";

/**
 * Place where an ad goes. Shows nothing for Premium / ad-free learners or
 * when ads are off for this app in the CMS.
 *
 * Until a real ad network (AdMob) is added, it shows our own small
 * "Go Premium" banner, and only when Premium is switched on in the CMS.
 * AdMob needs a development build and the unit ids from the CMS
 * (Ads page) — see fetchAdUnits() in api/premium.ts.
 */
export function AdSlot({ appId }: { appId: string }) {
  const state = useAsync(() => fetchEntitlement(appId), [appId]);
  const e = state.data;

  if (!e || e.adFree || !e.adsEnabled || !e.subscriptionsEnabled) return null;

  return (
    <Pressable
      onPress={() => router.push("/premium")}
      accessibilityRole="button"
      accessibilityLabel="Go Premium: learn without ads"
      style={({ pressed }) => [styles.banner, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.icon}>
        <Ionicons name="star" size={20} color={COLORS.goldIcon} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="label">Learn without ads</Txt>
        <Txt variant="caption">Go Premium and support new lessons.</Txt>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.goldText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.goldSoft,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
