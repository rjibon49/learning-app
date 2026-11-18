import { router, useLocalSearchParams } from "expo-router";

import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
} from "react-native";



import {
  verifyEmail,
  resendVerificationCode,
} from "../api/learner-auth";

import { getApiError } from "../api/client";

import {
  AuthLayout,
  Field,
  PrimaryButton,
  Feedback,
  TextAction,
} from "../components/AuthUI";


export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(60);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (seconds <= 0 || verified) return;

    const timer = setTimeout(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [seconds, verified]);

  async function handleVerify() {
    if (verifying || resending || verified) return;

    const otp = code.trim();

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setVerifying(true);
    setError("");
    setNotice("");

    try {
      const response = await verifyEmail(email, otp);

      if (!response.success) {
        throw new Error(
          response.message || "Verification failed."
        );
      }

      setVerified(true);
      setNotice("Email verified successfully.");

      router.dismissTo("/login");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (seconds > 0 || resending || verifying || verified) {
      return;
    }

    setResending(true);
    setError("");
    setNotice("");

    try {
      const result = await resendVerificationCode(email);

      setNotice(
        result.message ||
          "If eligible, a new code has been sent. Check Inbox and Spam/Junk."
      );

      setCode("");
      setSeconds(60);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle={`Enter the 6-digit code sent to ${email}. Each code is valid for 10 minutes.`}
    >
      <Feedback message={error} error />
      <Feedback message={notice} />

      <Field
        label="Verification Code"
        value={code}
        onChangeText={(value) =>
          setCode(value.replace(/\D/g, "").slice(0, 6))
        }
        keyboardType="number-pad"
        placeholder="000000"
        maxLength={6}
      />

      <PrimaryButton
        title="Verify Email"
        loading={verifying}
        disabled={resending || verified}
        onPress={() => void handleVerify()}
      />

      <View style={styles.resendBox}>
        <Text style={styles.helpText}>
          Didn&apos;t receive the verification email?
        </Text>

        <Text style={styles.helpText}>
          Check Inbox and Spam/Junk.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={
            seconds > 0 ||
            resending ||
            verifying ||
            verified
          }
          onPress={() => void handleResend()}
          style={styles.resendButton}
        >
          <Text
            style={[
              styles.resendText,
              (seconds > 0 || resending) && styles.disabled,
            ]}
          >
            {resending
              ? "Sending..."
              : seconds > 0
                ? `Resend code in ${seconds}s`
                : "Resend Verification Code"}
          </Text>
        </Pressable>
      </View>

      <TextAction
        title="Back to Sign In"
        onPress={() => router.dismissTo("/login")}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  resendBox: {
    marginTop: 22,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingTop: 18,
    alignItems: "center",
  },
  helpText: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 20,
    textAlign: "center",
  },
  resendButton: {
    padding: 14,
    marginTop: 7,
  },
  resendText: {
    fontSize: 14,
    color: "#4f46e5",
    fontWeight: "700",
  },
  disabled: {
    color: "#94a3b8",
  },
});
