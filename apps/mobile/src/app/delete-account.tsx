import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";

import { Button, Card, IconButton, Screen, Txt } from "../components/ui";
import { getApiError } from "../api/client";
import { deleteLearnerAccount } from "../api/learner-auth";
import { useLearnerAuth } from "../lib/auth-context";
import { COLORS, FONTS, RADIUS, SPACING } from "../styles/theme";

export default function DeleteAccountScreen() {
  const { signOut } = useLearnerAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function confirm() {
    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }
    Alert.alert(
      "Delete your account?",
      "Your progress, streak and personal data are removed. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void remove() },
      ],
    );
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await deleteLearnerAccount(password);
      await signOut();
      Alert.alert("Account deleted", "Your account has been removed.");
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen background={COLORS.surface} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />
          <Txt variant="title">Delete account</Txt>
        </View>

        <Card style={{ backgroundColor: COLORS.wrongSoft, gap: 6 }}>
          <Txt variant="label" style={{ color: COLORS.wrongText }}>This is permanent</Txt>
          <Txt variant="body" style={{ color: COLORS.wrongText, fontSize: 15, lineHeight: 22 }}>
            Your learning progress, streak and personal data will be deleted. If you have paid for a
            subscription, billing records are kept anonymously as the law requires.
          </Txt>
        </Card>

        <View style={{ gap: 8 }}>
          <Txt variant="label">Password</Txt>
          <TextInput
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) setError("");
            }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            placeholder="Your current password"
            placeholderTextColor={COLORS.faint}
            accessibilityLabel="Password"
            style={[styles.input, error ? { borderColor: COLORS.wrong } : null]}
          />
          {error ? <Txt variant="caption" style={{ color: COLORS.wrongText }}>{error}</Txt> : null}
        </View>

        <Button title="Delete my account" onPress={confirm} loading={busy} style={{ backgroundColor: COLORS.wrong, borderColor: COLORS.wrong }} />
        <Button title="Keep my account" variant="secondary" onPress={() => router.back()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginLeft: -SPACING.md,
    marginTop: -SPACING.md,
  },
  input: {
    minHeight: 52,
    borderWidth: 2,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    fontFamily: FONTS.body,
    fontSize: 16,
    color: COLORS.ink,
  },
});
