import React from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card, ErrorView, IconTile, LoadingView, ProgressBar, Screen, Txt } from "../../components/ui";
import { fetchActiveDays, fetchDashboard, fetchQuizHistory, utcDayKey } from "../../api/progress";
import { useLearnerAuth } from "../../lib/auth-context";
import { loadLearningPath } from "../../lib/learning-path";
import { useAsync, useRefreshOnFocus } from "../../lib/use-async";
import { COLORS, FONTS, RADIUS, SPACING } from "../../styles/theme";

const DAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function lastSevenDays(): { key: string; label: string; today: boolean }[] {
  const out = [];
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    out.push({ key: utcDayKey(d), label: DAY[d.getUTCDay()], today: i === 0 });
  }
  return out;
}

export default function ProgressScreen() {
  const { user, signOut } = useLearnerAuth();
  const state = useAsync(async () => {
    const [dashboard, active, history, path] = await Promise.all([
      fetchDashboard(),
      fetchActiveDays(7).catch(() => new Set<string>()),
      fetchQuizHistory(50).catch(() => []),
      loadLearningPath(user?.id ?? "").catch(() => null),
    ]);
    const avg =
      history.length > 0
        ? Math.round(history.reduce((sum, a) => sum + Number(a.percentage ?? 0), 0) / history.length)
        : null;
    return { dashboard, active, avg, path };
  }, [user?.id]);
  useRefreshOnFocus(state.refresh);

  function confirmSignOut() {
    Alert.alert("Sign out?", "Your progress is saved to your account.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  if (state.loading && !state.data) return <Screen scroll={false}><LoadingView /></Screen>;
  if (state.error && !state.data) return <Screen scroll={false}><ErrorView message={state.error} onRetry={() => void state.reload()} /></Screen>;
  if (!state.data) return null;

  const { dashboard, active, avg, path } = state.data;
  const days = lastSevenDays();

  return (
    <Screen onRefresh={() => void state.refresh()} refreshing={state.refreshing}>
      <Txt variant="h1">Progress</Txt>

      <Card style={{ gap: SPACING.lg }}>
        <View style={styles.streakHead}>
          <IconTile icon="flame" bg={COLORS.goldSoft} color={COLORS.goldIcon} size={48} />
          <View style={{ flex: 1 }}>
            <Txt variant="h2">{dashboard.streak.current} day streak</Txt>
            <Txt variant="caption">Best: {dashboard.streak.longest} day{dashboard.streak.longest === 1 ? "" : "s"}</Txt>
          </View>
        </View>
        <View style={styles.week}>
          {days.map((d) => {
            const done = active.has(d.key);
            return (
              <View key={d.key} style={styles.day} accessibilityLabel={`${d.label}: ${done ? "practised" : "no practice"}`}>
                <Txt variant="caption" style={d.today && { color: COLORS.primary, fontFamily: FONTS.bodySemi }}>{d.label}</Txt>
                <View
                  style={[
                    styles.dot,
                    done
                      ? { backgroundColor: COLORS.gold }
                      : d.today
                        ? { borderWidth: 2, borderColor: COLORS.primary }
                        : { backgroundColor: COLORS.track },
                  ]}
                >
                  {done ? <Ionicons name="checkmark" size={16} color="#5A3D00" /> : null}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Txt style={styles.statValue}>{dashboard.vocabulary.learned}</Txt>
          <Txt variant="caption">Words learned</Txt>
        </Card>
        <Card style={styles.stat}>
          <Txt style={styles.statValue}>{dashboard.lessons.completed}</Txt>
          <Txt variant="caption">Lessons done</Txt>
        </Card>
        <Card style={styles.stat}>
          <Txt style={styles.statValue}>{avg === null ? "–" : `${avg}%`}</Txt>
          <Txt variant="caption">Quiz average</Txt>
        </Card>
      </View>

      {path ? (
        <Card style={{ gap: SPACING.md }}>
          <Txt variant="title">{path.app.name}</Txt>
          {path.courses.map((c) => (
            <View key={c.id} style={{ gap: 6 }}>
              <View style={styles.modRow}>
                <Txt variant="body" style={{ fontSize: 14, flex: 1 }} numberOfLines={1}>{c.title}</Txt>
                <Txt variant="caption">{c.doneLessons}/{c.totalLessons}</Txt>
              </View>
              <ProgressBar value={(c.doneLessons / Math.max(1, c.totalLessons)) * 100} label={`${c.title} progress`} />
            </View>
          ))}
          <View style={styles.modRow}>
            <Txt variant="body" style={{ fontSize: 14 }}>Words to review</Txt>
            <Txt variant="caption">{dashboard.vocabulary.due} due · {dashboard.vocabulary.mastered} mastered</Txt>
          </View>
          {dashboard.vocabulary.due > 0 ? (
            <Button title="Review now" variant="secondary" onPress={() => router.push({ pathname: "/review", params: { mode: "due" } })} />
          ) : null}
        </Card>
      ) : null}

      <Card style={{ gap: SPACING.md }}>
        <Txt variant="title">Account</Txt>
        <Txt variant="caption" style={{ fontSize: 14 }}>{user?.displayName} · {user?.email}</Txt>
        <Button title="Settings" variant="secondary" icon="settings-outline" onPress={() => router.push("/settings")} />
        <Button title="Sign out" variant="secondary" icon="log-out-outline" onPress={confirmSignOut} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  streakHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  week: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  day: {
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  stats: {
    flexDirection: "row",
    gap: 10,
  },
  stat: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.lg,
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 24,
    lineHeight: 30,
    color: COLORS.ink,
  },
  modRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
});
