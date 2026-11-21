import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  PanResponder,
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
  /** Fly the card out (used by the buttons below the card). */
  swipe: (direction: SwipeDirection) => void;
};

const SWIPE_DISTANCE = 0.25; // of the screen width
const SWIPE_VELOCITY = 0.6;

/**
 * One flashcard with all details at once: word, article, plural,
 * pronunciation, meaning and examples.
 *  - Swipe left: next card · Swipe right: previous card (like turning pages).
 * Buttons outside the card do the same, so it also works without gestures
 * (screen readers, switch control).
 */
export const FlashCard = forwardRef<
  FlashCardHandle,
  {
    word: PracticeWord;
    disabled?: boolean;
    /** False on the first card: a swipe right springs back. */
    canGoBack?: boolean;
    onSwiped: (direction: SwipeDirection) => void;
  }
>(function FlashCard({ word, disabled = false, canGoBack = true, onSwiped }, ref) {
  const { width } = useWindowDimensions();
  const position = useRef(new Animated.ValueXY()).current;
  const appear = useRef(new Animated.Value(0)).current;
  const leaving = useRef(false);

  React.useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [appear]);

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

  function springBack() {
    Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
  }

  function flyOut(direction: SwipeDirection) {
    if (leaving.current) return;
    if (direction === "right" && !canGoBack) {
      springBack();
      return;
    }
    leaving.current = true;
    void Haptics.selectionAsync().catch(() => undefined);
    Animated.timing(position, {
      toValue: { x: (direction === "right" ? 1.5 : -1.5) * width, y: 0 },
      duration: 200,
      easing: Easing.in(Easing.quad),
      // The drag (Animated.event) runs on JS, so this value must too.
      useNativeDriver: false,
    }).start(() => onSwiped(direction));
  }

  useImperativeHandle(ref, () => ({ swipe: flyOut }));

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Only horizontal drags; vertical scrolling stays with the card content.
        onMoveShouldSetPanResponder: (_e, g) =>
          !disabled && !leaving.current && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: Animated.event([null, { dx: position.x }], { useNativeDriver: false }),
        onPanResponderRelease: (_e, g) => {
          const far = Math.abs(g.dx) > width * SWIPE_DISTANCE;
          const fast = Math.abs(g.vx) > SWIPE_VELOCITY && Math.abs(g.dx) > 40;
          if (far || fast) flyOut(g.dx < 0 ? "left" : "right");
          else springBack();
        },
        onPanResponderTerminate: springBack,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers read refs
    [disabled, width, canGoBack],
  );

  const rotate = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ["-8deg", "0deg", "8deg"],
    extrapolate: "clamp",
  });
  const nextOpacity = position.x.interpolate({ inputRange: [-width * SWIPE_DISTANCE, -20], outputRange: [1, 0], extrapolate: "clamp" });
  const backOpacity = position.x.interpolate({ inputRange: [20, width * SWIPE_DISTANCE], outputRange: [0, 1], extrapolate: "clamp" });

  const articleColor = view.article ? ARTICLE_COLORS[view.article] : null;
  const otherMeanings = view.meanings.filter((t) => t.meaning !== view.meaning);

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[styles.wrap, { opacity: appear, transform: [{ translateX: position.x }, { rotate }] }]}
    >
      <View style={styles.face}>
        {articleColor ? <View style={[styles.stripe, { backgroundColor: articleColor.bg }]} /> : null}
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {word.imageUrl ? (
            <Image source={{ uri: word.imageUrl }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : null}

          {/* Word */}
          <View style={styles.head}>
            <View style={styles.termRow}>
              {view.article ? <ArticleChip article={view.article} size="lg" /> : null}
              <Txt style={styles.term} adjustsFontSizeToFit numberOfLines={2}>{view.noun}</Txt>
            </View>
            {word.pronunciation ? <Txt variant="caption" style={{ fontSize: 15 }}>{word.pronunciation}</Txt> : null}
            <SpeakButton text={view.spoken} url={word.audioUrl} size={52} />
            {articleColor ? (
              <Txt variant="caption" style={{ color: articleColor.fg }}>{articleColor.label} noun</Txt>
            ) : null}
          </View>

          {/* Meaning */}
          <View style={styles.section}>
            <Txt variant="overline">Meaning</Txt>
            <Txt style={styles.meaning}>{view.meaning ?? "No meaning added yet"}</Txt>
            {otherMeanings.map((t) => (
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
      </View>

      {/* Swipe labels */}
      <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampRight, { opacity: nextOpacity }]}>
        <Txt style={[styles.stampText, { color: COLORS.primary }]}>Next</Txt>
        <Ionicons name="arrow-forward-circle" size={22} color={COLORS.primary} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampLeft, { opacity: backOpacity }]}>
        <Ionicons name="arrow-back-circle" size={22} color={COLORS.muted} />
        <Txt style={[styles.stampText, { color: COLORS.muted }]}>Back</Txt>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  face: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    overflow: "hidden",
    ...SHADOW.raised,
  },
  stripe: { height: 8 },
  image: { width: "100%", height: 150, borderRadius: RADIUS.lg, backgroundColor: COLORS.track },
  body: { padding: SPACING.xl, gap: SPACING.lg },
  head: { alignItems: "center", gap: SPACING.sm },
  termRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" },
  term: { fontFamily: FONTS.display, fontSize: 36, lineHeight: 44, color: COLORS.ink, textAlign: "center" },
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
  stampRight: { right: SPACING.xl, borderColor: COLORS.primary },
  stampLeft: { left: SPACING.xl, borderColor: COLORS.borderStrong },
  stampText: { fontFamily: FONTS.title, fontSize: 16 },
});
