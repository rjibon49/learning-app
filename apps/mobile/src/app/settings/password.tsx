import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";

import { Button, Screen, TextField, TopBar, Txt } from "../../components/ui";
import { getApiError } from "../../api/client";
import { useLearnerAuth } from "../../lib/auth-context";
import { COLORS } from "../../styles/theme";

const MIN_LENGTH = 12;

export default function ChangePasswordScreen() {
  const { changePassword } = useLearnerAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; repeat?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  function check() {
    const e: typeof errors = {};
    if (!current) e.current = "Enter your current password.";
    if (next.length < MIN_LENGTH) e.next = `Use at least ${MIN_LENGTH} characters.`;
    else if (next === current) e.next = "Choose a password you have not used here.";
    if (repeat !== next) e.repeat = "The two new passwords are not the same.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!check()) return;
    setBusy(true);
    try {
      await changePassword(current, next);
      Alert.alert("Password changed", "Other phones and browsers were signed out.");
      router.back();
    } catch (e) {
      const message = getApiError(e);
      setErrors(/incorrect/i.test(message) ? { current: message } : { form: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={["top", "bottom"]}>
        <TopBar title="Change password" />
        <TextField
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          error={errors.current}
        />
        <TextField
          label="New password"
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          error={errors.next}
          hint={`At least ${MIN_LENGTH} characters.`}
        />
        <TextField
          label="Repeat new password"
          value={repeat}
          onChangeText={setRepeat}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={() => void save()}
          error={errors.repeat}
        />
        {errors.form ? <Txt variant="caption" style={{ color: COLORS.wrongText }}>{errors.form}</Txt> : null}
        <Button title="Change password" onPress={() => void save()} loading={busy} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
