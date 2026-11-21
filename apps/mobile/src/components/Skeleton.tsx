import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";

import { COLORS, RADIUS, SHADOW, SPACING } from "../styles/theme";

/**
 * Grey placeholders in the shape of the real screen, shown while it loads.
 * All bones pulse together (one shared animation); with "Reduce motion"
 * switched on they stay still.
 */
const pulse = new Animated.Value(0);
let running: Animated.CompositeAnimation | null = null;
let users = 0;

function usePulse() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (alive) setReduceMotion(on);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    users += 1;
    if (!running) {
      running = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
      running.start();
    }
    return () => {
      users -= 1;
      if (users === 0 && running) {
        running.stop();
        running = null;
      }
    };
  }, [reduceMotion]);

  return reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
}

/** One placeholder block. */
export function Bone({
  width = "100%",
  height = 14,
  radius = RADIUS.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = usePulse();
  return <Animated.View style={[styles.bone, { width, height, borderRadius: radius, opacity }, style]} />;
}

/** Wrapper: tells screen readers the screen is loading, hides the bones. */
function Frame({ children, label = "Loading", style }: { children: React.ReactNode; label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[styles.frame, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      {children}
    </View>
  );
}

function CardBones({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function TitleBones() {
  return (
    <View style={{ gap: SPACING.sm }}>
      <Bone width={90} height={11} />
      <Bone width="60%" height={28} radius={RADIUS.md} />
    </View>
  );
}

/** A few list rows: icon + two lines. */
function RowBones({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.row}>
          <Bone width={44} height={44} radius={RADIUS.md} />
          <View style={{ flex: 1, gap: 8 }}>
            <Bone width={i % 2 ? "55%" : "70%"} height={14} />
            <Bone width="40%" height={11} />
          </View>
        </View>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Screen presets                                                      */
/* ------------------------------------------------------------------ */

export function HomeSkeleton() {
  return (
    <Frame label="Loading your day">
      <View style={styles.between}>
        <TitleBones />
        <Bone width={70} height={34} radius={RADIUS.pill} />
      </View>
      <View style={styles.hero}>
        <Bone width="45%" height={11} style={styles.onDark} />
        <Bone width="75%" height={24} style={styles.onDark} />
        <Bone height={8} radius={RADIUS.pill} style={styles.onDark} />
        <Bone height={50} radius={RADIUS.lg} style={[styles.onDark, { marginTop: SPACING.sm }]} />
      </View>
      <View style={styles.stats}>
        {[0, 1, 2].map((i) => (
          <CardBones key={i} style={styles.stat}>
            <Bone width={22} height={22} radius={11} />
            <Bone width={36} height={20} />
            <Bone width="70%" height={10} />
          </CardBones>
        ))}
      </View>
      <CardBones>
        <Bone width={120} height={11} />
        <Bone width="50%" height={26} />
        <Bone width="65%" height={13} />
      </CardBones>
      <CardBones>
        <RowBones count={2} />
      </CardBones>
    </Frame>
  );
}

export function CoursesSkeleton() {
  return (
    <Frame label="Loading courses">
      <TitleBones />
      <View style={styles.chips}>
        {[96, 120, 88, 110].map((w, i) => (
          <Bone key={i} width={w} height={40} radius={RADIUS.pill} />
        ))}
      </View>
      <CardBones>
        <Bone width={100} height={11} />
        <Bone width="80%" height={24} />
        <Bone width="95%" height={12} />
        <Bone height={8} radius={RADIUS.pill} />
      </CardBones>
      {[0, 1, 2].map((i) => (
        <CardBones key={i}>
          <Bone width="35%" height={11} />
          <Bone width="65%" height={18} />
          <RowBones count={3} />
        </CardBones>
      ))}
    </Frame>
  );
}

export function ListSkeleton({ label = "Loading", rows = 8, title = true }: { label?: string; rows?: number; title?: boolean }) {
  return (
    <Frame label={label}>
      {title ? <TitleBones /> : null}
      <Bone height={48} radius={RADIUS.lg} />
      <View style={styles.chips}>
        {[60, 54, 58, 70].map((w, i) => (
          <Bone key={i} width={w} height={34} radius={RADIUS.pill} />
        ))}
      </View>
      <CardBones>
        <RowBones count={rows} />
      </CardBones>
    </Frame>
  );
}

export function LessonSkeleton() {
  return (
    <Frame label="Opening lesson">
      <Bone width="40%" height={11} />
      <Bone width="85%" height={30} radius={RADIUS.md} />
      <View style={{ gap: 10 }}>
        <Bone height={13} />
        <Bone height={13} />
        <Bone width="70%" height={13} />
      </View>
      <Bone width="50%" height={20} style={{ marginTop: SPACING.md }} />
      <CardBones style={{ padding: 0, overflow: "hidden" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.tableRow}>
            <Bone width="35%" height={13} />
            <Bone width="45%" height={13} />
          </View>
        ))}
      </CardBones>
      <View style={{ gap: 10 }}>
        <Bone height={13} />
        <Bone width="80%" height={13} />
      </View>
    </Frame>
  );
}

export function QuizSkeleton() {
  return (
    <Frame label="Loading quiz">
      <Bone height={8} radius={RADIUS.pill} />
      <Bone width="30%" height={11} style={{ marginTop: SPACING.lg }} />
      <Bone width="90%" height={24} />
      <Bone width="60%" height={24} />
      <View style={{ gap: SPACING.md, marginTop: SPACING.lg }}>
        {[0, 1, 2].map((i) => (
          <Bone key={i} height={58} radius={RADIUS.lg} />
        ))}
      </View>
    </Frame>
  );
}

export function FlashcardSkeleton() {
  return (
    <Frame label="Shuffling cards" style={{ flex: 1 }}>
      <View style={[styles.card, styles.flashcard]}>
        <Bone width={70} height={30} radius={RADIUS.pill} />
        <Bone width="60%" height={40} radius={RADIUS.md} />
        <Bone width={52} height={52} radius={26} />
        <Bone width="70%" height={22} style={{ marginTop: SPACING.lg }} />
        <Bone width="85%" height={13} />
        <Bone width="75%" height={13} />
      </View>
      <View style={styles.stats}>
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} height={56} radius={RADIUS.lg} style={{ flex: 1, width: undefined }} />
        ))}
      </View>
    </Frame>
  );
}

export function ProgressSkeleton() {
  return (
    <Frame label="Loading progress">
      <TitleBones />
      <View style={styles.stats}>
        {[0, 1, 2].map((i) => (
          <CardBones key={i} style={styles.stat}>
            <Bone width={40} height={24} />
            <Bone width="70%" height={10} />
          </CardBones>
        ))}
      </View>
      <CardBones>
        <Bone width="45%" height={18} />
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ gap: 6 }}>
            <View style={styles.between}>
              <Bone width="55%" height={13} />
              <Bone width={36} height={11} />
            </View>
            <Bone height={8} radius={RADIUS.pill} />
          </View>
        ))}
      </CardBones>
    </Frame>
  );
}

export function DetailSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <Frame label={label}>
      <CardBones style={{ alignItems: "center" }}>
        <Bone width={70} height={30} radius={RADIUS.pill} />
        <Bone width="55%" height={36} radius={RADIUS.md} />
        <Bone width={52} height={52} radius={26} />
      </CardBones>
      <CardBones>
        <Bone width={90} height={11} />
        <Bone width="70%" height={20} />
        <Bone width="50%" height={14} />
      </CardBones>
      <CardBones>
        <RowBones count={3} />
      </CardBones>
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: { gap: SPACING.lg },
  bone: { backgroundColor: COLORS.track },
  onDark: { backgroundColor: "rgba(255,255,255,0.25)" },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  stats: { flexDirection: "row", gap: SPACING.md },
  stat: { flex: 1, alignItems: "center", gap: 6 },
  chips: { flexDirection: "row", gap: SPACING.sm, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.md },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  flashcard: { flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING.md, borderRadius: 28 },
});
