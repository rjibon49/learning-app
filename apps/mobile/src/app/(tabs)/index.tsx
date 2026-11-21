import React, { useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card, ErrorView, IconTile, LoadingView, ProgressBar, Screen, StreakPill, Txt } from "../../components/ui";
import { AdSlot } from "../../components/AdSlot";
import { PathCard, StatsRow, WeekStrip, WordOfDay, pickWordOfDay } from "../../components/TodayExtras";
import { fetchAppWords } from "../../api/vocabulary";
import { fetchUnreadCount } from "../../api/inbox";
import { GOALS, usePrefs } from "../../lib/preferences";
import { fetchActiveDays, fetchDashboard, utcDayKey } from "../../api/progress";
import { fetchQuizzes } from "../../api/quizzes";
import { useLearnerAuth } from "../../lib/auth-context";
import { loadLearningPath } from "../../lib/learning-path";
import { useAsync } from "../../lib/use-async";
import { COLORS, FONTS, RADIUS, SPACING } from "../../styles/theme";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

export default function TodayScreen() {
  const { user } = useLearnerAuth();
  const userId = user?.id ?? "";
  const { prefs, steps } = usePrefs(user?.id);

  const state = useAsync(async () => {
    const [path, dashboard, activeDays] = await Promise.all([
      loadLearningPath(userId),
      fetchDashboard(),
      fetchActiveDays(7).catch(() => new Set<string>()),
    ]);
    const [quizzes, unread, words] = await Promise.all([
      fetchQuizzes(path.app.id).catch(() => []),
      fetchUnreadCount(path.app.id).catch(() => 0),
      fetchAppWords(path.app.id).catch(() => []),
    ]);
    return {
      unread,
      activeDays,
      wordOfDay: pickWordOfDay(words),
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

  const { path, dashboard, practicedToday, quiz, unread, activeDays, wordOfDay } = state.data;
  const goal = prefs.dailyGoal;
  const goalDone = steps >= goal;
  const goalLabel = GOALS.find((g) => g.value === goal)?.title ?? "";
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
        <View style={styles.headerRight}>
          <StreakPill days={dashboard.streak.current} />
          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            hitSlop={8}
            style={styles.bell}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.ink} />
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
            style={styles.bell}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.ink} />
          </Pressable>
        </View>
      </View>

      <Card style={{ gap: SPACING.lg }}>
        <Pressable style={styles.goal} onPress={() => router.push("/settings")} accessibilityRole="button" accessibilityLabel={`Daily goal ${Math.min(steps, goal)} of ${goal}. Change goal`}>
          <View style={[styles.goalRing, goalDone && { borderColor: COLORS.correct }]}>
            {goalDone ? (
              <Ionicons name="checkmark" size={28} color={COLORS.correct} />
            ) : (
              <Txt variant="title" style={{ color: COLORS.primary }}>{Math.min(steps, goal)}/{goal}</Txt>
            )}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="title">{goalDone ? "Goal done today" : `Today's goal · ${goalLabel}`}</Txt>
            <Txt variant="caption" style={{ fontSize: 14, lineHeight: 20 }}>
              {goalDone
                ? "Great work! Extra practice still helps."
                : practicedToday
                  ? `Streak safe. ${goal - steps} more step${goal - steps === 1 ? "" : "s"} for your goal.`
                  : "Finish a lesson, review or quiz to keep your streak."}
            </Txt>
          </View>
        </Pressable>
        <WeekStrip active={activeDays} />
      </Card>

      <StatsRow dashboard={dashboard} path={path} />

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

      {wordOfDay ? <WordOfDay word={wordOfDay} /> : null}

      {path.totalLessons > 0 ? <PathCard path={path} /> : null}

      <AdSlot appId={path.app.id} />
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  bell: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: COLORS.wrong,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: FONTS.bodySemi,
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
