import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";

import { Card, Chip, ErrorView, ListRow, LoadingView, Screen, SpeedToggle, SwitchRow, TopBar, Txt } from "../../components/ui";
import { getApiError } from "../../api/client";
import { fetchMarketingPreferences, saveMarketingPreferences, type MarketingPreferences } from "../../api/account";
import { useLearnerAuth } from "../../lib/auth-context";
import { GOALS, savePrefs, usePrefs } from "../../lib/preferences";
import { useContentLanguage } from "../../lib/content-language";
import { languageLabel } from "../../lib/language-names";
import { useAsync } from "../../lib/use-async";
import { COLORS, SPACING } from "../../styles/theme";
import { showAdPrivacyOptions, useAdsState } from "../../lib/ads";

export default function SettingsScreen() {
  const { user, signOut } = useLearnerAuth();
  const { prefs } = usePrefs(user?.id);
  const language = useContentLanguage();
  const adsPrivacy = useAdsState().privacyOptionsRequired;
  const marketing = useAsync(fetchMarketingPreferences, []);
  const [saving, setSaving] = useState<keyof MarketingPreferences | null>(null);
  const [override, setOverride] = useState<Partial<Pick<MarketingPreferences, "email" | "whatsapp" | "sms">>>({});

  async function toggle(key: "email" | "whatsapp" | "sms", value: boolean) {
    if (!marketing.data) return;
    const current = { email: marketing.data.email, whatsapp: marketing.data.whatsapp, sms: marketing.data.sms, ...override };
    const next = { ...current, [key]: value };
    setOverride(next);
    setSaving(key);
    try {
      await saveMarketingPreferences(next);
    } catch (e) {
      setOverride(current);
      Alert.alert("Not saved", getApiError(e));
    } finally {
      setSaving(null);
    }
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "Your progress is saved to your account.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  const m = marketing.data ? { ...marketing.data, ...override } : null;

  return (
    <Screen edges={["top", "bottom"]}>
      <TopBar title="Settings" />

      <Txt variant="overline">Account</Txt>
      <Card style={styles.group}>
        <ListRow
          icon="person-outline"
          title="Name"
          subtitle={user?.displayName}
          onPress={() => router.push("/settings/profile")}
        />
        <View style={styles.divider} />
        <ListRow icon="mail-outline" title="Email" subtitle={user?.email} />
        <View style={styles.divider} />
        <ListRow icon="key-outline" title="Change password" onPress={() => router.push("/settings/password")} />
      </Card>

      <Txt variant="overline">Learning</Txt>
      <Card style={styles.group}>
        <ListRow
          icon="language-outline"
          title="Explanation language"
          subtitle={languageLabel(language)}
          onPress={() => router.push("/settings/language")}
        />
      </Card>
      <Card style={{ gap: SPACING.md }}>
        <Txt variant="label">Daily goal</Txt>
        <View style={styles.chips}>
          {GOALS.map((g) => (
            <Chip
              key={g.value}
              label={g.title}
              selected={prefs.dailyGoal === g.value}
              onPress={() => user && void savePrefs(user.id, { dailyGoal: g.value })}
            />
          ))}
        </View>
        <Txt variant="caption">{GOALS.find((g) => g.value === prefs.dailyGoal)?.detail}</Txt>
        <View style={styles.divider} />
        <Txt variant="label">Pronunciation speed</Txt>
        <SpeedToggle />
      </Card>

      <Txt variant="overline">News & offers</Txt>
      <Card style={styles.group}>
        {marketing.loading && !m ? (
          <LoadingView />
        ) : marketing.error && !m ? (
          <ErrorView message={marketing.error} onRetry={() => void marketing.reload()} />
        ) : m ? (
          <>
            <SwitchRow
              title="Email"
              subtitle="Tips, new lessons and offers"
              value={m.email}
              disabled={saving !== null || !m.contact.emailVerified}
              onChange={(v) => void toggle("email", v)}
            />
            <View style={styles.divider} />
            <SwitchRow
              title="WhatsApp"
              subtitle={m.contact.hasPhone ? "Messages to your phone number" : "Add a phone number on the website first"}
              value={m.whatsapp}
              disabled={saving !== null || !m.contact.hasPhone}
              onChange={(v) => void toggle("whatsapp", v)}
            />
            <View style={styles.divider} />
            <SwitchRow
              title="SMS"
              subtitle={m.contact.hasPhone ? "Text messages" : "Add a phone number on the website first"}
              value={m.sms}
              disabled={saving !== null || !m.contact.hasPhone}
              onChange={(v) => void toggle("sms", v)}
            />
          </>
        ) : null}
      </Card>
      <Txt variant="caption">Account emails (password reset, security) are always sent.</Txt>

      <Card style={styles.group}>
        <ListRow icon="notifications-outline" title="Notifications" onPress={() => router.push("/notifications")} />
        <View style={styles.divider} />
        <ListRow icon="shield-checkmark-outline" title="Privacy policy" onPress={() => router.push("/legal/privacy")} />
        {adsPrivacy ? (
          <>
            <View style={styles.divider} />
            <ListRow
              icon="options-outline"
              title="Ad privacy choices"
              subtitle="Change your consent for ads"
              onPress={() => void showAdPrivacyOptions()}
            />
          </>
        ) : null}
        <View style={styles.divider} />
        <ListRow icon="document-text-outline" title="Terms of use" onPress={() => router.push("/legal/terms")} />
        <View style={styles.divider} />
        <ListRow icon="log-out-outline" title="Sign out" onPress={confirmSignOut} />
        <View style={styles.divider} />
        <ListRow icon="trash-outline" title="Delete account" danger onPress={() => router.push("/delete-account")} />
      </Card>

      <Txt variant="caption" style={{ textAlign: "center" }}>
        Version {Constants.expoConfig?.version ?? "1.0.0"}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { paddingVertical: SPACING.xs },
  divider: { height: 1, backgroundColor: COLORS.border },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
});
