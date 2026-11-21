import { router } from "expo-router";

import React, { useState } from "react";


import {
  requestPasswordReset,
} from "../api/learner-auth";

import { getApiError } from "../api/client";

import {
  AuthLayout,
  Field,
  PrimaryButton,
  Feedback,
  TextAction,
} from "../components/AuthUI";


export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await requestPasswordReset(email);
      setNotice(result.message);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot Password?"
      subtitle="Enter your email. If your account exists, reset instructions will be sent. Check Inbox and Spam/Junk."
    >
      <Feedback message={error} error />
      <Feedback message={notice} />

      <Field
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="your@email.com"
      />

      <PrimaryButton
        title="Send Reset Instructions"
        loading={loading}
        onPress={() => void submit()}
      />

      <TextAction
        title="Already have a reset token? Reset Password"
        onPress={() =>
          router.push("/reset-password")
        }
      />

      <TextAction
        title="Back to Sign In"
        onPress={() => router.dismissTo("/login")}
      />
    </AuthLayout>
  );
}
