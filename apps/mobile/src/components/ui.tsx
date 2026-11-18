import React, { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { play, setSpeed, useNowPlaying, useSpeed, type Speed } from "../lib/audio";
import { germanVoiceStatus } from "../lib/german-speech";
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

/**
 * Plays German: the recording when `url` is set, otherwise the device voice.
 * Highlights while playing; tap again to stop.
 */
export function SpeakButton({
  text,
  url,
  size = 44,
  filled = false,
}: {
  text: string;
  url?: string | null;
  size?: number;
  filled?: boolean;
}) {
  const playing = useNowPlaying() === text;
  const solid = filled || playing;

  function onPress() {
    void Haptics.selectionAsync().catch(() => undefined);
    void play({ text, url, key: text }).catch(() => undefined);
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={playing ? `Stop ${text}` : `Play ${text}`}
      accessibilityState={{ selected: playing }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.speak,
        { width: size, height: size, backgroundColor: solid ? COLORS.primary : COLORS.primarySoft },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={playing ? "stop" : "volume-high"} size={size * 0.46} color={solid ? "#FFFFFF" : COLORS.primary} />
    </Pressable>
  );
}

/** Normal / Slow pronunciation speed (remembered on the device). */
export function SpeedToggle() {
  const speed = useSpeed();
  const options: { key: Speed; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "normal", label: "Normal", icon: "speedometer-outline" },
    { key: "slow", label: "Slow", icon: "walk-outline" },
  ];
  return (
    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Pronunciation speed">
      {options.map((o) => {
        const active = speed === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => setSpeed(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[styles.segmentItem, active && styles.segmentActive]}
          >
            <Ionicons name={o.icon} size={16} color={active ? COLORS.primary : COLORS.muted} />
            <Text style={[styles.segmentText, active && { color: COLORS.primary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Shown when the phone has no German voice: explains how to add one
 * (recordings from the CMS still play).
 */
export function GermanVoiceNotice() {
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let live = true;
    void germanVoiceStatus().then((s) => {
      if (live) setMissing(s === "missing");
    });
    return () => {
      live = false;
    };
  }, []);
  if (!missing) return null;
  return (
    <View style={styles.notice} accessibilityRole="alert">
      <Ionicons name="information-circle" size={20} color={COLORS.tipText} />
      <Text style={styles.noticeText}>
        No German voice on this phone yet. Open Settings → Accessibility → Text-to-speech (or Languages &amp; input),
        choose Google Speech Services and install “Deutsch (Deutschland)”.
      </Text>
    </View>
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
/* Screen header, forms and settings rows                              */
/* ------------------------------------------------------------------ */

/** Back arrow + title for pushed screens (settings, word detail ...). */
export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.topBar}>
      <IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />
      <Txt variant="title" style={{ flex: 1 }} numberOfLines={1}>{title}</Txt>
      {right}
    </View>
  );
}

/** Labelled input with the error shown right under it. */
export function TextField({
  label,
  error,
  hint,
  ...input
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      <TextInput
        placeholderTextColor={COLORS.faint}
        accessibilityLabel={label}
        {...input}
        style={[styles.input, error ? { borderColor: COLORS.wrong } : null, input.style]}
      />
      {error ? (
        <Txt variant="caption" style={{ color: COLORS.wrongText }} accessibilityLiveRegion="polite">{error}</Txt>
      ) : hint ? (
        <Txt variant="caption">{hint}</Txt>
      ) : null}
    </View>
  );
}

/** Tappable row with icon, title, optional subtitle and a chevron. */
export function ListRow({
  icon,
  iconColor = COLORS.primary,
  iconBg = COLORS.primarySoft,
  title,
  subtitle,
  onPress,
  right,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  const body = (
    <>
      <IconTile icon={icon} bg={danger ? COLORS.wrongSoft : iconBg} color={danger ? COLORS.wrong : iconColor} size={36} />
      <View style={{ flex: 1 }}>
        <Txt variant="label" style={danger && { color: COLORS.wrongText }}>{title}</Txt>
        {subtitle ? <Txt variant="caption">{subtitle}</Txt> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={COLORS.faint} /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.listRow}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

/** On/off setting. The whole row is the touch target. */
export function SwitchRow({
  title,
  subtitle,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={title}
      style={[styles.listRow, disabled && { opacity: 0.55 }]}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="label">{title}</Txt>
        {subtitle ? <Txt variant="caption">{subtitle}</Txt> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: COLORS.primary, false: COLORS.track }}
        thumbColor="#FFFFFF"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

/** Selectable pill (filters, goal choice). */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : null,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && { color: "#FFFFFF" }]}>{label}</Text>
    </Pressable>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginLeft: -SPACING.md,
    marginTop: -SPACING.md,
  },
  input: {
    minHeight: 52,
    borderWidth: 2,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    fontFamily: FONTS.body,
    fontSize: 16,
    color: COLORS.ink,
    backgroundColor: COLORS.surface,
  },
  listRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
    color: COLORS.ink,
  },
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
  segment: { flexDirection: "row", backgroundColor: COLORS.track, borderRadius: RADIUS.pill, padding: 3 },
  segmentItem: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, minHeight: 36, borderRadius: RADIUS.pill },
  segmentActive: { backgroundColor: COLORS.surface },
  segmentText: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.muted },
  notice: { flexDirection: "row", gap: SPACING.sm, backgroundColor: COLORS.tipSoft, borderRadius: RADIUS.lg, padding: SPACING.md },
  noticeText: { flex: 1, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: COLORS.tipText },
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
