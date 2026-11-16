
import React, { type ReactNode } from "react";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardTypeOptions,
} from "react-native";

export const colors = {
  primary: "#4f46e5",
  dark: "#0f172a",
  secondary: "#64748b",
  border: "#cbd5e1",
  background: "#f8fafc",
  white: "#ffffff",
  error: "#b91c1c",
};

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Text style={styles.brandText}>GL</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.card}>{children}</View>

        <Text style={styles.footer}>
          Global Learning · German A1
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        maxLength={maxLength}
      />
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        (loading || disabled) && styles.disabled,
      ]}
      activeOpacity={0.85}
      disabled={loading || disabled}
      onPress={onPress}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export function TextAction({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.textAction}
      accessibilityRole="button"
    >
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Feedback({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  if (!message) return null;

  return (
    <View
      style={[
        styles.feedback,
        error ? styles.errorBox : styles.successBox,
      ]}
    >
      <Text
        style={[
          styles.feedbackText,
          error && { color: colors.error },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 36,
  },
  brand: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  brandText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.dark,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    padding: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    minHeight: 50,
    fontSize: 15,
    color: colors.dark,
  },
  button: {
    backgroundColor: colors.primary,
    minHeight: 51,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  disabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  textAction: {
    alignItems: "center",
    paddingVertical: 13,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "center",
  },
  footer: {
    color: "#94a3b8",
    textAlign: "center",
    fontSize: 12,
    marginTop: 24,
  },
  feedback: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
  },
  successBox: {
    backgroundColor: "#ecfdf5",
  },
  feedbackText: {
    color: "#047857",
    fontSize: 13,
    lineHeight: 19,
  },
});
