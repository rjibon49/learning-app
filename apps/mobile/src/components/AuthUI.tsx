
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

import { COLORS, FONTS, RADIUS } from "../styles/theme";

export const colors = {
  primary: COLORS.primary,
  dark: COLORS.ink,
  secondary: COLORS.muted,
  border: COLORS.borderStrong,
  background: COLORS.ground,
  white: COLORS.surface,
  error: COLORS.wrongText,
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
          <Text style={styles.brandText}>A1</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.card}>{children}</View>

        <Text style={styles.footer}>
          German A1
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
        placeholderTextColor={COLORS.faint}
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
    fontFamily: FONTS.display,
    fontSize: 22,
  },
  title: {
    fontSize: 30,
    fontFamily: FONTS.display,
    color: colors.dark,
  },
  subtitle: {
    color: colors.secondary,
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: COLORS.ink,
    fontSize: 14,
    fontFamily: FONTS.bodySemi,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    minHeight: 52,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: colors.dark,
  },
  button: {
    backgroundColor: colors.primary,
    minHeight: 54,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  disabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: FONTS.display,
  },
  textAction: {
    alignItems: "center",
    paddingVertical: 13,
  },
  actionText: {
    fontSize: 14,
    fontFamily: FONTS.bodySemi,
    color: colors.primary,
    textAlign: "center",
  },
  footer: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
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
    backgroundColor: COLORS.wrongSoft,
  },
  successBox: {
    backgroundColor: COLORS.correctSoft,
  },
  feedbackText: {
    color: COLORS.correctText,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 19,
  },
});
