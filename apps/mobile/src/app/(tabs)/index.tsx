import React, { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card, ErrorView, IconTile, LoadingView, ProgressBar, Screen, StreakPill, Txt } from "../../components/ui";
import { fetchActiveDays, fetchDashboard, utcDayKey } from "../../api/progress";
import { fetchQuizzes } from "../../api/quizzes";
import { useLearnerAuth } from "../../lib/auth-context";
import { loadLearningPath } from "../../lib/learning-path";
import { useAsync } from "../../lib/use-async";
import { COLORS, RADIUS, SPACING } from "../../styles/theme";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

export default function TodayScreen() {
  const { user } = useLearnerAuth();
  const userId = user?.id ?? "";

  const state = useAsync(async () => {
    const [path, dashboard, activeDays] = await Promise.all([
      loadLearningPath(userId),
      fetchDashboard(),
      fetchActiveDays(1).catch(() => new Set<string>()),
    ]);
    const quizzes = await fetchQuizzes(path.app.id).catch(() => []);
    return {
      path,
      dashboard,
      practicedToday: activeDays.has(utcDayKey(new Date())),
      quiz: quizzes[0] ?? null,
    };
  }, [userId]);

  // Coming back from a lesson or review: show the new streak and due count.
  // (The first focus is the initial load, so skip it.)
  const { refresh } = state;
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) void refresh();
      focusedOnce.current = true;
    }, [refresh]),
  );

  if (state.loading && !state.data) return <Screen scroll={false}><LoadingView /></Screen>;
  if (state.error && !state.data) return <Screen scroll={false}><ErrorView message={state.error} onRetry={() => void state.reload()} /></Screen>;
  if (!state.data) return null;

  const { path, dashboard, practicedToday, quiz } = state.data;
  const next = path.next;
  const moduleOfNext = next ? path.modules.find((m) => m.lessons.some((l) => l.id === next.id)) : null;
  const firstName = (dashboard.user.displayName || user?.displayName || "").split(" ")[0];

  return (
    <Screen onRefresh={() => void state.refresh()} refreshing={state.refreshing}>
      <View style={styles.header}>
        <View style={{ flexShrink: 1 }}>
          <Txt variant="caption" style={{ fontSize: 14 }}>{greeting()},</Txt>
          <Txt variant="h1" numberOfLines={1}>{firstName || "there"}</Txt>
        </View>
        <StreakPill days={dashboard.streak.current} />
      </View>

      <Card style={styles.goal}>
        <View style={[styles.goalRing, practicedToday && { borderColor: COLORS.correct }]}>
          <Ionicons
            name={practicedToday ? "checkmark" : "flag-outline"}
            size={28}
            color={practicedToday ? COLORS.correct : COLORS.primary}
          />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="title">{practicedToday ? "Goal done today" : "Today's goal"}</Txt>
          <Txt variant="caption" style={{ fontSize: 14, lineHeight: 20 }}>
            {practicedToday
              ? "Your streak is safe. Extra practice still helps!"
              : "Finish one lesson, review or quiz to keep your streak."}
          </Txt>
        </View>
      </Card>

      {next && moduleOfNext ? (
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Txt variant="overline" style={{ color: COLORS.onPrimarySoft }} numberOfLines={1}>
              Continue · {moduleOfNext.title}
            </Txt>
            <Txt variant="caption" style={{ color: COLORS.onPrimarySoft }}>
              Lesson {next.number} of {moduleOfNext.lessons.length}
            </Txt>
          </View>
          <Txt variant="h2" style={{ color: "#FFFFFF" }}>{next.title}</Txt>
          <ProgressBar
            value={(moduleOfNext.done / Math.max(1, moduleOfNext.lessons.length)) * 100}
            color={COLORS.gold}
            track="rgba(255,255,255,0.25)"
            label="Module progress"
          />
          <Button
            title={moduleOfNext.done === 0 && next.number === 1 ? "Start lesson" : "Continue lesson"}
            variant="inverse"
            icon="chevron-forward"
            onPress={() => router.push(`/lesson/${next.id}`)}
          />
        </View>
      ) : (
        <Card>
          <Txt variant="title">
            {path.totalLessons === 0 ? "Lessons are coming soon" : "You finished every lesson!"}
          </Txt>
          <Txt variant="caption" style={{ marginTop: 4 }}>
            {path.totalLessons === 0
              ? "New A1 lessons will appear here as soon as they are published."
              : "Keep your German fresh with reviews and quizzes."}
          </Txt>
        </Card>
      )}

      <View style={styles.grid}>
        <Card
          style={styles.tile}
          onPress={() => router.push({ pathname: "/review", params: { mode: "due" } })}
          accessibilityLabel={`Review words, ${dashboard.vocabulary.due} due today`}
        >
          <IconTile icon="albums-outline" bg={COLORS.correctSoft} color={COLORS.correct} />
          <Txt variant="title" style={{ fontSize: 16 }}>Review words</Txt>
          <Txt variant="caption">
            {dashboard.vocabulary.due > 0 ? `${dashboard.vocabulary.due} due today` : "All caught up"}
          </Txt>
        </Card>
        <Card
          style={styles.tile}
          onPress={() => (quiz ? router.push(`/quiz/${quiz.id}`) : router.push("/practice"))}
          accessibilityLabel={quiz ? `Quick quiz: ${quiz.title}` : "Practice"}
        >
          <IconTile icon="help-circle-outline" bg="#FFF1E6" color="#C2410C" />
          <Txt variant="title" style={{ fontSize: 16 }}>Quick quiz</Txt>
          <Txt variant="caption" numberOfLines={1}>
            {quiz ? `${quiz._count?.questions ?? ""} questions`.trim() : "Coming soon"}
          </Txt>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  goal: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
  },
  goalRing: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    borderWidth: 6,
    borderColor: COLORS.track,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    gap: SPACING.md + 2,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  grid: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  tile: {
    flex: 1,
    gap: 10,
  },
});
