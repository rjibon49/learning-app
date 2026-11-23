import { router } from "expo-router";

import React, { useState } from "react";

import {
  Switch,
  Text,
  View,
  StyleSheet,
} from "react-native";



import { registerLearner } from "../api/learner-auth";
import { trackSignUp } from "../lib/analytics";
import { getApiError } from "../api/client";

import {
  AuthLayout,
  Field,
  PrimaryButton,
  Feedback,
  TextAction,
} from "../components/AuthUI";


export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [marketingEmail, setMarketingEmail] =
    useState(false);
  const [marketingWhatsapp, setMarketingWhatsapp] =
    useState(false);
  const [marketingSms, setMarketingSms] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (loading) return;

    if (displayName.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError("Password must be 8–128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const phone = phoneNumber.trim();

    if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
      setError(
        "Phone must include country code, e.g. +8801XXXXXXXXX."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      await registerLearner({
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
        ...(phone ? { phoneNumber: phone } : {}),
        marketing: {
          email: marketingEmail,
          whatsapp: marketingWhatsapp,
          sms: marketingSms,
        },
      });
      trackSignUp();

      router.push({ pathname: "/verify-email", params: {
        email: email.trim().toLowerCase(),
      } });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start learning German with your free account."
    >
      <Feedback message={error} error />

      <Field
        label="Full Name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        autoCapitalize="words"
        maxLength={120}
      />

      <Field
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="your@email.com"
      />

      <Field
        label="Phone Number (Optional)"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        placeholder="+8801XXXXXXXXX"
      />

      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Minimum 12 characters"
        maxLength={128}
      />

      <Field
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="Re-enter password"
      />

      <View style={styles.consentSection}>
        <Text style={styles.consentTitle}>
          Optional Marketing Preferences
        </Text>

        <Text style={styles.hint}>
          These choices are optional. You can change
          your preferences later.
        </Text>

        <ConsentRow
          label="Marketing Emails"
          value={marketingEmail}
          onChange={setMarketingEmail}
        />

        <ConsentRow
          label="WhatsApp Marketing"
          value={marketingWhatsapp}
          onChange={setMarketingWhatsapp}
        />

        <ConsentRow
          label="SMS Marketing"
          value={marketingSms}
          onChange={setMarketingSms}
        />

        <Text style={styles.hint}>
          Account verification uses email OTP only.
          WhatsApp and SMS verification are not required.
        </Text>
      </View>

      <Text style={styles.hint}>
        By creating an account you agree to our{" "}
        <Text style={styles.link} accessibilityRole="link" onPress={() => router.push("/legal/terms")}>
          Terms of use
        </Text>{" "}
        and{" "}
        <Text style={styles.link} accessibilityRole="link" onPress={() => router.push("/legal/privacy")}>
          Privacy policy
        </Text>
        .
      </Text>

      <PrimaryButton
        title="Create Account"
        loading={loading}
        onPress={() => void handleRegister()}
      />

      <TextAction
        title="Already have an account? Sign In"
        onPress={() => router.dismissTo("/login")}
      />
    </AuthLayout>
  );
}

function ConsentRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.consentRow}>
      <Text style={styles.consentLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: "#cbd5e1",
          true: "#a5b4fc",
        }}
        thumbColor={value ? "#4f46e5" : "#ffffff"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    color: "#2747E0",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  consentSection: {
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingTop: 16,
    marginTop: 3,
  },
  consentTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 7,
  },
  hint: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 19,
    marginBottom: 10,
  },
  consentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  consentLabel: {
    fontSize: 13,
    color: "#334155",
  },
});
