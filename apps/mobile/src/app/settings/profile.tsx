import React, { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";

import { Button, Screen, TextField, TopBar } from "../../components/ui";
import { getApiError } from "../../api/client";
import { useLearnerAuth } from "../../lib/auth-context";

export default function EditProfileScreen() {
  const { user, updateDisplayName } = useLearnerAuth();
  const [name, setName] = useState(user?.displayName ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const unchanged = trimmed === (user?.displayName ?? "");

  async function save() {
    if (!trimmed) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updateDisplayName(trimmed);
      router.back();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={["top", "bottom"]}>
        <TopBar title="Your name" />
        <TextField
          label="Name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (error) setError("");
          }}
          autoFocus
          autoCapitalize="words"
          autoComplete="name"
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={() => void save()}
          error={error}
          hint="Shown on your Today screen."
        />
        <Button title="Save" onPress={() => void save()} loading={busy} disabled={unchanged || !trimmed} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
