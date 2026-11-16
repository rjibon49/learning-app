
import React, { useState } from "react";
import type { NativeStackScreenProps } from
  "@react-navigation/native-stack";

import type { RootStackParamList } from
  "../navigation/AppNavigator";

import { useLearnerAuth } from "../lib/auth-context";
import { getApiError } from "../api/client";

import {
  AuthLayout,
  Field,
  PrimaryButton,
  TextAction,
  Feedback,
} from "../components/AuthUI";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "Login"
>;

export default function LoginScreen({
  navigation,
}: Props) {
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
          navigation.navigate("ForgotPassword")
        }
      />

      <TextAction
        title="Don't have an account? Create one"
        onPress={() => navigation.navigate("Register")}
      />
    </AuthLayout>
  );
}
