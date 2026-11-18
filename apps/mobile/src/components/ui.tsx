import React, { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { speakGerman } from "../lib/german-speech";
import { ARTICLE_COLORS, COLORS, FONTS, RADIUS, SHADOW, SPACING, TOUCH, type Article } from "../styles/theme";

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

type Variant = "display" | "h1" | "h2" | "title" | "body" | "bodyLarge" | "caption" | "label" | "overline";

const TEXT: Record<Variant, TextStyle> = {
  display: { fontFamily: FONTS.display, fontSize: 40, lineHeight: 46, color: COLORS.ink },
  h1: { fontFamily: FONTS.display, fontSize: 28, lineHeight: 34, color: COLORS.ink },
  h2: { fontFamily: FONTS.display, fontSize: 24, lineHeight: 30, color: COLORS.ink },
  title: { fontFamily: FONTS.title, fontSize: 18, lineHeight: 24, color: COLORS.ink },
  body: { fontFamily: FONTS.body, fontSize: 16, lineHeight: 24, color: COLORS.ink },
  bodyLarge: { fontFamily: FONTS.body, fontSize: 18, lineHeight: 29, color: COLORS.ink },
  caption: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, color: COLORS.muted },
  label: { fontFamily: FONTS.bodySemi, fontSize: 15, lineHeight: 20, color: COLORS.ink },
  overline: {
    fontFamily: FONTS.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: COLORS.muted,
  },
};

export function Txt({
  variant = "body",
  style,
  ...rest
}: TextProps & { variant?: Variant; style?: StyleProp<TextStyle> }) {
  return <Text {...rest} style={[TEXT[variant], style]} maxFontSizeMultiplier={1.6} />;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  background = COLORS.ground,
  edges = ["top"],
  contentStyle,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  background?: string;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            ) : undefined
          }
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "inverse" | "success";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: COLORS.primary, fg: "#FFFFFF", border: COLORS.primary },
    secondary: { bg: COLORS.surface, fg: COLORS.ink, border: COLORS.borderStrong },
    inverse: { bg: COLORS.surface, fg: COLORS.primary, border: COLORS.surface },
    success: { bg: COLORS.correct, fg: "#FFFFFF", border: COLORS.correct },
  }[variant];
  const inactive = loading || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        inactive && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          <Text style={[styles.buttonText, { color: palette.fg }]}>{title}</Text>
          {icon ? <Ionicons name={icon} size={20} color={palette.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color = COLORS.muted,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={24} color={color} />
    </Pressable>
  );
}

/** Speaks German text with the device voice. */
export function SpeakButton({
  text,
  size = 44,
  filled = false,
}: {
  text: string;
  size?: number;
  filled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function play() {
    if (busy) return;
    setBusy(true);
    void Haptics.selectionAsync().catch(() => undefined);
    try {
      await speakGerman(text);
    } catch {
      // No German voice installed: nothing to play.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      onPress={() => void play()}
      accessibilityRole="button"
      accessibilityLabel={`Play ${text}`}
      hitSlop={6}
      style={({ pressed }) => [
        styles.speak,
        { width: size, height: size, backgroundColor: filled ? COLORS.primary : COLORS.primarySoft },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="volume-high" size={size * 0.48} color={filled ? "#FFFFFF" : COLORS.primary} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  height = 8,
  color = COLORS.primary,
  track = COLORS.track,
  label,
}: {
  value: number;
  height?: number;
  color?: string;
  track?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={{ height, borderRadius: RADIUS.pill, backgroundColor: track, overflow: "hidden" }}
    >
      <View style={{ width: `${pct}%`, height, borderRadius: RADIUS.pill, backgroundColor: color }} />
    </View>
  );
}

export function ArticleChip({ article, size = "md" }: { article: Article; size?: "md" | "lg" }) {
  const c = ARTICLE_COLORS[article];
  const lg = size === "lg";
  return (
    <View
      accessibilityLabel={`${article}, ${c.label.toLowerCase()}`}
      style={{
        backgroundColor: c.bg,
        borderRadius: RADIUS.sm,
        paddingHorizontal: lg ? 12 : 8,
        paddingVertical: lg ? 6 : 3,
      }}
    >
      <Text style={{ color: c.fg, fontFamily: FONTS.display, fontSize: lg ? 20 : 15 }}>{article}</Text>
    </View>
  );
}

export function StreakPill({ days }: { days: number }) {
  return (
    <View style={styles.streak} accessibilityLabel={`${days} day streak`}>
      <Ionicons name="flame" size={18} color={COLORS.goldIcon} />
      <Text style={styles.streakNumber}>{days}</Text>
      <Text style={styles.streakLabel}>day streak</Text>
    </View>
  );
}

export function IconTile({
  icon,
  bg,
  color,
  size = 40,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
  size?: number;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={size * 0.55} color={color} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function LoadingView({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Txt variant="caption" style={{ marginTop: SPACING.md }}>{label}</Txt>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={40} color={COLORS.faint} />
      <Txt variant="title" style={{ marginTop: SPACING.md, textAlign: "center" }}>Something went wrong</Txt>
      <Txt variant="caption" style={{ marginTop: SPACING.xs, textAlign: "center" }}>{message}</Txt>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} style={{ marginTop: SPACING.lg, alignSelf: "stretch" }} /> : null}
    </View>
  );
}

export function EmptyView({
  icon = "sparkles-outline",
  title,
  message,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.state}>
      <Ionicons name={icon} size={40} color={COLORS.faint} />
      <Txt variant="title" style={{ marginTop: SPACING.md, textAlign: "center" }}>{title}</Txt>
      {message ? <Txt variant="caption" style={{ marginTop: SPACING.xs, textAlign: "center" }}>{message}</Txt> : null}
      {action ? <View style={{ marginTop: SPACING.lg, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  button: {
    minHeight: 54,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    paddingHorizontal: SPACING.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  buttonText: {
    fontFamily: FONTS.display,
    fontSize: 17,
  },
  iconButton: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  speak: {
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.goldSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  streakNumber: {
    fontFamily: FONTS.title,
    fontSize: 16,
    color: COLORS.goldText,
  },
  streakLabel: {
    fontFamily: FONTS.titleMedium,
    fontSize: 12,
    color: COLORS.goldText,
  },
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxl,
    minHeight: 260,
  },
});
