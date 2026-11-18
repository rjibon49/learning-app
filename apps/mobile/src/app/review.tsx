import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import {
  ArticleChip,
  Button,
  EmptyView,
  ErrorView,
  IconButton,
  LoadingView,
  ProgressBar,
  Screen,
  SpeakButton,
  SpeedToggle,
  Txt,
} from "../components/ui";
import { getCurrentApp } from "../api/app";
import { getApiError } from "../api/client";
import {
  RATINGS,
  fetchDeckWords,
  fetchDueWords,
  fetchLessonWords,
  reviewWord,
  type PracticeWord,
  type RatingKey,
} from "../api/practice";
import { play, stopAudio } from "../lib/audio";
import { useAsync } from "../lib/use-async";
import { exampleOf, meaningOf, pluralOf, splitArticle } from "../lib/words";
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from "../styles/theme";
import { useLearnerAuth } from "../lib/auth-context";
import { recordStep } from "../lib/preferences";

type Mode = "due" | "deck" | "lesson";

const RATING_STYLE: Record<RatingKey, { bg: string; fg: string; hint: string }> = {
  again: { bg: COLORS.wrongSoft, fg: COLORS.wrongText, hint: "Soon" },
  hard: { bg: COLORS.warnSoft, fg: COLORS.warnText, hint: "Later" },
  good: { bg: COLORS.correctSoft, fg: COLORS.correctText, hint: "In days" },
  easy: { bg: COLORS.primary, fg: "#FFFFFF", hint: "Much later" },
};

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ mode?: string; deckId?: string; lessonId?: string; title?: string }>();
  const mode: Mode = params.mode === "deck" || params.mode === "lesson" ? params.mode : "due";
  const title =
    typeof params.title === "string" && params.title
      ? params.title
      : mode === "due"
        ? "Daily review"
        : "Practice";

  const state = useAsync(async (): Promise<PracticeWord[]> => {
    if (mode === "deck" && params.deckId) return fetchDeckWords(params.deckId);
    if (mode === "lesson" && params.lessonId) {
      const app = await getCurrentApp();
      return fetchLessonWords(app.id, params.lessonId);
    }
    return (await fetchDueWords(20)).words;
  }, [mode, params.deckId, params.lessonId]);

  // The queue grows when a card is rated "Again" (seen once more at the end).
  const [queue, setQueue] = useState<PracticeWord[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [known, setKnown] = useState(0);
  const [retried, setRetried] = useState<Set<string>>(new Set());

  const cards = queue ?? state.data ?? [];
  const card = cards[index];
  const finished = cards.length > 0 && index >= cards.length;
  const { user } = useLearnerAuth();
  const counted = useRef(false);
  useEffect(() => {
    // One finished review session = one step toward the daily goal.
    if (finished && !counted.current) {
      counted.current = true;
      void recordStep(user?.id);
    }
  }, [finished, user?.id]);

  // Leaving the session stops audio.
  useEffect(() => () => void stopAudio(), []);

  const view = useMemo(() => {
    if (!card) return null;
    const { article, noun } = splitArticle(card);
    return {
      article,
      noun,
      spoken: article ? `${article} ${noun}` : noun,
      meaning: meaningOf(card),
      plural: pluralOf(card),
      example: exampleOf(card),
    };
  }, [card]);

  // Each new card says its word once, so the learner hears it before answering.
  const cardKey = card ? `${card.id}:${index}` : "";
  useEffect(() => {
    if (!card || !view) return;
    const t = setTimeout(() => {
      void play({ text: view.spoken, url: card.audioUrl, key: view.spoken }).catch(() => undefined);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per card
  }, [cardKey]);

  async function rate(key: RatingKey) {
    if (!card || saving) return;
    const rating = RATINGS.find((r) => r.key === key);
    if (!rating) return;

    setSaving(true);
    setError("");
    try {
      await reviewWord(card.id, rating.quality);
    } catch (e) {
      // Keep going; the word simply stays due on the server.
      setError(`Not saved: ${getApiError(e)}`);
    } finally {
      setSaving(false);
    }

    let nextLength = cards.length;
    if (key === "again" && !retried.has(card.id)) {
      setRetried((s) => new Set(s).add(card.id));
      setQueue([...cards, card]);
      nextLength += 1;
    } else if (key !== "again") {
      setKnown((n) => n + 1);
    }

    const lastCard = index + 1 >= nextLength;
    void (lastCard
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.selectionAsync()
    ).catch(() => undefined);

    setRevealed(false);
    setIndex((i) => i + 1);
  }

  const topBar = (
    <View style={styles.topBar}>
      <IconButton icon="close" label="Close practice" onPress={() => router.back()} />
      <View style={{ flex: 1 }}>
        <Txt variant="title" style={{ fontSize: 16 }} numberOfLines={1}>{title}</Txt>
        {cards.length > 0 && !finished ? (
          <Txt variant="caption">Card {index + 1} of {cards.length}</Txt>
        ) : null}
      </View>
      {cards.length > 0 && !finished ? <SpeedToggle /> : null}
    </View>
  );

  if (state.loading && !state.data) return <Screen scroll={false} edges={["top", "bottom"]}>{topBar}<LoadingView label="Shuffling cards…" /></Screen>;
  if (state.error && !state.data) return <Screen scroll={false} edges={["top", "bottom"]}>{topBar}<ErrorView message={state.error} onRetry={() => void state.reload()} /></Screen>;

  if (cards.length === 0) {
    return (
      <Screen scroll={false} edges={["top", "bottom"]}>
        {topBar}
        <EmptyView
          icon="checkmark-done-outline"
          title={mode === "due" ? "All caught up!" : "No cards here yet"}
          message={mode === "due" ? "No words are due right now. Come back later or learn new words in a deck." : "Words appear here once they are published."}
          action={<Button title="Back" variant="secondary" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen scroll={false} edges={["top", "bottom"]} contentStyle={{ justifyContent: "center" }}>
        <View style={styles.doneIcon}>
          <Ionicons name="sparkles" size={40} color={COLORS.goldIcon} />
        </View>
        <Txt variant="h1" style={{ textAlign: "center" }}>Sehr gut!</Txt>
        <Txt variant="body" style={{ textAlign: "center", color: COLORS.muted }}>
          You reviewed {state.data?.length ?? cards.length} word{(state.data?.length ?? 0) === 1 ? "" : "s"}
          {known > 0 ? ` and knew ${known}` : ""}. The app will bring each one back right before you forget it.
        </Txt>
        <Button title="Done" onPress={() => router.back()} style={{ marginTop: SPACING.lg }} />
      </Screen>
    );
  }

  if (!card || !view) return null;

  return (
    <Screen scroll={false} edges={["top", "bottom"]}>
      {topBar}
      <ProgressBar value={(index / cards.length) * 100} label="Session progress" />

      <Pressable
        onPress={() => setRevealed(true)}
        disabled={revealed}
        accessibilityRole="button"
        accessibilityHint={revealed ? undefined : "Shows the meaning"}
        style={styles.card}
      >
        {card.imageUrl ? (
          <Image source={{ uri: card.imageUrl }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : null}
        <View style={styles.cardBody}>
          <View style={styles.termRow}>
            {view.article ? <ArticleChip article={view.article} size="lg" /> : null}
            <Txt style={styles.term} adjustsFontSizeToFit numberOfLines={2}>{view.noun}</Txt>
          </View>
          {card.pronunciation || view.plural ? (
            <Txt variant="caption" style={{ fontSize: 15, textAlign: "center" }}>
              {[view.plural ? `Plural: die ${view.plural.replace(/^die\s+/i, "")}` : null, card.pronunciation].filter(Boolean).join(" · ")}
            </Txt>
          ) : null}
          <SpeakButton text={view.spoken} url={card.audioUrl} size={52} />

          {revealed ? (
            <View style={styles.answer} accessibilityLiveRegion="polite">
              <Txt style={styles.meaning}>{view.meaning ?? "No meaning added yet"}</Txt>
              {view.example ? (
                <View style={styles.exampleRow}>
                  <Txt variant="caption" style={{ fontSize: 15, flexShrink: 1, textAlign: "center" }}>„{view.example}“</Txt>
                  <SpeakButton text={view.example} size={36} />
                </View>
              ) : null}
            </View>
          ) : (
            <Txt variant="caption" style={{ marginTop: SPACING.md }}>Tap the card to see the meaning</Txt>
          )}
        </View>
      </Pressable>

      {error ? <Txt variant="caption" style={{ color: COLORS.wrongText, textAlign: "center" }}>{error}</Txt> : null}

      {revealed ? (
        <View style={{ gap: SPACING.sm }}>
          <Txt variant="caption" style={{ textAlign: "center" }}>How well did you know it?</Txt>
          <View style={styles.ratings}>
            {RATINGS.map((r) => {
              const s = RATING_STYLE[r.key];
              return (
                <Pressable
                  key={r.key}
                  disabled={saving}
                  onPress={() => void rate(r.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.label}, review ${s.hint.toLowerCase()}`}
                  style={({ pressed }) => [styles.rating, { backgroundColor: s.bg }, (pressed || saving) && { opacity: 0.7 }]}
                >
                  <Txt style={[styles.ratingLabel, { color: s.fg }]}>{r.label}</Txt>
                  <Txt style={[styles.ratingHint, { color: s.fg }]}>{s.hint}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <Button title="Show answer" onPress={() => setRevealed(true)} />
      )}
    </Screen>
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
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    overflow: "hidden",
    ...SHADOW.raised,
  },
  image: {
    width: "100%",
    height: 180,
    backgroundColor: COLORS.track,
  },
  cardBody: {
    flex: 1,
    padding: SPACING.xxl,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  term: {
    fontFamily: FONTS.display,
    fontSize: 40,
    lineHeight: 48,
    color: COLORS.ink,
    textAlign: "center",
  },
  answer: {
    alignSelf: "stretch",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderStrong,
    borderStyle: "dashed",
    paddingTop: SPACING.md,
    alignItems: "center",
    gap: SPACING.sm,
  },
  meaning: {
    fontFamily: FONTS.title,
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.ink,
    textAlign: "center",
  },
  exampleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  ratings: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  rating: {
    flex: 1,
    minHeight: 56,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  ratingLabel: {
    fontFamily: FONTS.title,
    fontSize: 15,
  },
  ratingHint: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
  },
  doneIcon: {
    alignSelf: "center",
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
