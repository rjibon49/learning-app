import { router } from "expo-router";

import React, { useState } from "react";


import { useLearnerAuth } from "../lib/auth-context";
import { getApiError } from "../api/client";
import { trackLogin } from "../lib/analytics";

import {
  AuthLayout,
  Field,
  PrimaryButton,
  TextAction,
  Feedback,
} from "../components/AuthUI";


export default function LoginScreen() {
  const { signIn } = useLearnerAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      await signIn(email, password);
      trackLogin();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back!"
      subtitle="Sign in to continue your German learning journey."
    >
      <Feedback message={error} error />

      <Field
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        placeholder="your@email.com"
        keyboardType="email-address"
      />

      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry
      />

      <PrimaryButton
        title="Sign In"
        loading={loading}
        onPress={() => void handleLogin()}
      />

      <TextAction
        title="Forgot your password?"
        onPress={() =>
          router.push("/forgot-password")
        }
      />

      <TextAction
        title="Don't have an account? Create one"
        onPress={() => router.push("/register")}
      />
    </AuthLayout>
  );
}
