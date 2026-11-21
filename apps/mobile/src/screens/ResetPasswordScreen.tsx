import { router } from "expo-router";

import React, { useState } from "react";



import { resetPassword } from "../api/learner-auth";
import { getApiError } from "../api/client";

import {
  AuthLayout,
  Field,
  PrimaryButton,
  Feedback,
  TextAction,
} from "../components/AuthUI";


export default function ResetPasswordScreen() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit() {
    if (!/^[a-f0-9]{64}$/i.test(token.trim())) {
      setError("Enter the 64-character email reset token.");
      return;
    }

    if (
      password.length < 12 ||
      password.length > 128
    ) {
      setError("Password must be 12–128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      await resetPassword(token, password);

      setNotice("Password changed successfully.");
      router.dismissTo("/login");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Use the reset token from your email. It is valid for 15 minutes and can only be used once."
    >
      <Feedback message={error} error />
      <Feedback message={notice} />

      <Field
        label="Email Reset Token"
        value={token}
        onChangeText={setToken}
        placeholder="Paste your reset token"
        maxLength={64}
      />

      <Field
        label="New Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Minimum 12 characters"
        secureTextEntry
      />

      <Field
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm password"
        secureTextEntry
      />

      <PrimaryButton
        title="Update Password"
        loading={loading}
        onPress={() => void submit()}
      />

      <TextAction
        title="Back to Sign In"
        onPress={() => router.dismissTo("/login")}
      />
    </AuthLayout>
  );
}
