import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import type { PracticeWord } from "../api/practice";
import { meaningOf, pluralOf, splitArticle } from "../lib/words";
import { getContentLanguage, languagePreference, useContentLanguage } from "../lib/content-language";
import { ARTICLE_COLORS, COLORS, FONTS, RADIUS, SHADOW, SPACING } from "../styles/theme";
import { ArticleChip, SpeakButton, Txt } from "./ui";

export type SwipeDirection = "left" | "right";

export type FlashCardHandle = {
  /** Fly the card out (used by the rating buttons). */
  swipe: (direction: SwipeDirection) => void;
  flip: () => void;
};

const SWIPE_DISTANCE = 0.28; // of the screen width
const SWIPE_VELOCITY = 0.6;

/**
 * One flashcard.
 *  - Tap: turns the card over to the details (meaning, plural, examples, tip).
 *  - Swipe right: "I knew it" · Swipe left: "Again".
 * Buttons outside the card do the same, so it also works without gestures
 * (screen readers, switch control).
 */
export const FlashCard = forwardRef<
  FlashCardHandle,
  {
    word: PracticeWord;
    disabled?: boolean;
    onFlip?: (showingBack: boolean) => void;
    onSwiped: (direction: SwipeDirection) => void;
  }
>(function FlashCard({ word, disabled = false, onFlip, onSwiped }, ref) {
  const { width } = useWindowDimensions();
  const position = useRef(new Animated.ValueXY()).current;
  const turn = useRef(new Animated.Value(0)).current;
  const [back, setBack] = useState(false);
  const leaving = useRef(false);

  const language = useContentLanguage();
  const view = useMemo(() => {
    const order = languagePreference();
    const rank = (code: string) => {
      const i = order.indexOf(code);
      return i === -1 ? order.length : i;
    };
    const { article, noun } = splitArticle(word);
    const meanings = word.translations
      .slice()
      .sort((a, b) => rank(a.language.code) - rank(b.language.code));
    const germanExamples = word.examples.filter((e) => e.language.code === "de");
    return {
      article,
      noun,
      spoken: article ? `${article} ${noun}` : noun,
      meaning: meaningOf(word),
      meanings,
      plural: pluralOf(word),
      examples: (germanExamples.length ? germanExamples : word.examples).slice(0, 3).map((ex) => ({
        id: ex.id,
        text: ex.text,
        isGerman: ex.language.code === "de",
        translation: ex.translationGroupId
          ? word.examples.find(
              (o) =>
                o.translationGroupId === ex.translationGroupId &&
                o.id !== ex.id &&
                o.language.code === getContentLanguage(),
            )?.text ??
            word.examples.find((o) => o.translationGroupId === ex.translationGroupId && o.id !== ex.id)?.text ??
            null
          : null,
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- language changes the order
  }, [word, language]);

  function flip() {
    if (leaving.current) return;
    const next = !back;
    setBack(next);
    onFlip?.(next);
    void Haptics.selectionAsync().catch(() => undefined);
    Animated.timing(turn, {
      toValue: next ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function flyOut(direction: SwipeDirection) {
    if (leaving.current) return;
    leaving.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    Animated.timing(position, {
      toValue: { x: (direction === "right" ? 1.5 : -1.5) * width, y: 0 },
      duration: 220,
      easing: Easing.in(Easing.quad),
      // The drag (Animated.event) runs on JS, so this value must too.
      useNativeDriver: false,
    }).start(() => onSwiped(direction));
  }

  function springBack() {
    Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
  }

  useImperativeHandle(ref, () => ({ swipe: flyOut, flip }));

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Only horizontal drags; taps and vertical scrolling stay with the card content.
        onMoveShouldSetPanResponder: (_e, g) =>
          !disabled && !leaving.current && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_e, g) => {
          const far = Math.abs(g.dx) > width * SWIPE_DISTANCE;
          const fast = Math.abs(g.vx) > SWIPE_VELOCITY && Math.abs(g.dx) > 40;
          if (far || fast) flyOut(g.dx > 0 ? "right" : "left");
          else springBack();
        },
        onPanResponderTerminate: springBack,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers read refs
    [disabled, width],
  );

  const rotate = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });
  const knowOpacity = position.x.interpolate({ inputRange: [20, width * SWIPE_DISTANCE], outputRange: [0, 1], extrapolate: "clamp" });
  const againOpacity = position.x.interpolate({ inputRange: [-width * SWIPE_DISTANCE, -20], outputRange: [1, 0], extrapolate: "clamp" });

  const frontTurn = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backTurn = turn.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  // Opacity switch as well: some Android versions ignore backfaceVisibility.
  const frontOpacity = turn.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = turn.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [0, 0, 1, 1] });

  const articleColor = view.article ? ARTICLE_COLORS[view.article] : null;

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[styles.wrap, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
    >
      {/* FRONT */}
      <Animated.View
        pointerEvents={back ? "none" : "auto"}
        style={[styles.face, { opacity: frontOpacity, transform: [{ perspective: 1200 }, { rotateY: frontTurn }] }]}
      >
        <Pressable
          onPress={flip}
          accessibilityRole="button"
          accessibilityLabel={`${view.spoken}. Tap to see details`}
          style={{ flex: 1 }}
        >
          {articleColor ? <View style={[styles.stripe, { backgroundColor: articleColor.bg }]} /> : null}
          {word.imageUrl ? (
            <Image source={{ uri: word.imageUrl }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : null}
          <View style={styles.frontBody}>
            <View style={styles.termRow}>
              {view.article ? <ArticleChip article={view.article} size="lg" /> : null}
              <Txt style={styles.term} adjustsFontSizeToFit numberOfLines={2}>{view.noun}</Txt>
            </View>
            {word.pronunciation ? (
              <Txt variant="caption" style={{ fontSize: 15 }}>{word.pronunciation}</Txt>
            ) : null}
            <SpeakButton text={view.spoken} url={word.audioUrl} size={56} />
            <View style={styles.tapHint}>
              <Ionicons name="hand-left-outline" size={16} color={COLORS.faint} />
              <Txt variant="caption">Tap for details</Txt>
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {/* BACK: details */}
      <Animated.View
        pointerEvents={back ? "auto" : "none"}
        style={[styles.face, styles.backFace, { opacity: backOpacity, transform: [{ perspective: 1200 }, { rotateY: backTurn }] }]}
      >
        <ScrollView contentContainerStyle={styles.backBody} showsVerticalScrollIndicator={false}>
          <Pressable onPress={flip} accessibilityRole="button" accessibilityLabel="Turn card back" style={styles.backHead}>
            {view.article ? <ArticleChip article={view.article} /> : null}
            <Txt variant="h2" style={{ flexShrink: 1 }}>{view.noun}</Txt>
            <SpeakButton text={view.spoken} url={word.audioUrl} size={40} />
          </Pressable>

          {articleColor ? (
            <Txt variant="caption" style={{ color: articleColor.fg }}>{articleColor.label} noun</Txt>
          ) : null}

          <View style={styles.section}>
            <Txt variant="overline">Meaning</Txt>
            <Txt style={styles.meaning}>{view.meaning ?? "No meaning added yet"}</Txt>
            {view.meanings
              .filter((t) => t.meaning !== view.meaning)
              .map((t) => (
                <Txt key={`${t.language.code}-${t.meaning}`} variant="body" style={{ color: COLORS.muted }}>
                  {t.language.code.toUpperCase()}: {t.meaning}
                </Txt>
              ))}
          </View>

          {view.plural ? (
            <View style={styles.section}>
              <Txt variant="overline">Plural</Txt>
              <View style={styles.inline}>
                <ArticleChip article="die" />
                <Txt variant="title">{view.plural.replace(/^die\s+/i, "")}</Txt>
                <SpeakButton text={`die ${view.plural.replace(/^die\s+/i, "")}`} size={34} />
              </View>
            </View>
          ) : null}

          {view.examples.length > 0 ? (
            <View style={styles.section}>
              <Txt variant="overline">Examples</Txt>
              {view.examples.map((ex) => (
                <View key={ex.id} style={styles.example}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="body">{ex.text}</Txt>
                    {ex.translation ? <Txt variant="caption">{ex.translation}</Txt> : null}
                  </View>
                  {ex.isGerman ? <SpeakButton text={ex.text} size={34} /> : null}
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>

      {/* Swipe labels */}
      <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampRight, { opacity: knowOpacity }]}>
        <Ionicons name="checkmark-circle" size={22} color={COLORS.correct} />
        <Txt style={[styles.stampText, { color: COLORS.correct }]}>Know it</Txt>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampLeft, { opacity: againOpacity }]}>
        <Ionicons name="refresh-circle" size={22} color={COLORS.wrong} />
        <Txt style={[styles.stampText, { color: COLORS.wrong }]}>Again</Txt>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  face: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    overflow: "hidden",
    backfaceVisibility: "hidden",
    ...SHADOW.raised,
  },
  backFace: { backgroundColor: COLORS.surface },
  stripe: { height: 8 },
  image: { width: "100%", height: 170, backgroundColor: COLORS.track },
  frontBody: { flex: 1, padding: SPACING.xxl, alignItems: "center", justifyContent: "center", gap: SPACING.md },
  termRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" },
  term: { fontFamily: FONTS.display, fontSize: 40, lineHeight: 48, color: COLORS.ink, textAlign: "center" },
  tapHint: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: SPACING.sm },
  backBody: { padding: SPACING.xl, gap: SPACING.lg },
  backHead: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  section: { gap: 6 },
  meaning: { fontFamily: FONTS.title, fontSize: 22, lineHeight: 28, color: COLORS.ink },
  inline: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  example: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  stamp: {
    position: "absolute",
    top: SPACING.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
  },
  stampRight: { left: SPACING.xl, borderColor: COLORS.correct, transform: [{ rotate: "-8deg" }] },
  stampLeft: { right: SPACING.xl, borderColor: COLORS.wrong, transform: [{ rotate: "8deg" }] },
  stampText: { fontFamily: FONTS.title, fontSize: 18 },
});
