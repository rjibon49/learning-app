import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card, EmptyView, ErrorView, LoadingView, ProgressBar, Screen, Txt } from "../../components/ui";
import { useLearnerAuth } from "../../lib/auth-context";
import { loadLearningPath, type PathLesson, type PathModule } from "../../lib/learning-path";
import { useAsync, useRefreshOnFocus } from "../../lib/use-async";
import { COLORS, FONTS, RADIUS, SPACING } from "../../styles/theme";

function LessonRow({ lesson }: { lesson: PathLesson }) {
  const minutes = lesson.estimatedMinutes ? `${lesson.estimatedMinutes} min` : null;
  const status = {
    done: "Completed",
    current: "Up next",
    open: "Not started",
    locked: "Locked",
  }[lesson.status];
  const sub = [status, minutes].filter(Boolean).join(" · ");
  const isCurrent = lesson.status === "current";
  const locked = lesson.status === "locked";

  return (
    <Pressable
      disabled={locked}
      onPress={() => router.push(`/lesson/${lesson.id}`)}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      accessibilityLabel={`Lesson ${lesson.number}: ${lesson.title}. ${sub}`}
      style={({ pressed }) => [styles.row, isCurrent && styles.rowCurrent, pressed && { opacity: 0.8 }]}
    >
      {lesson.status === "done" ? (
        <View style={[styles.badge, { backgroundColor: COLORS.correct }]}>
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        </View>
      ) : (
        <View
          style={[
            styles.badge,
            isCurrent ? { backgroundColor: COLORS.primary } : { borderWidth: 2, borderColor: COLORS.borderStrong },
          ]}
        >
          <Txt style={[styles.badgeText, { color: isCurrent ? "#FFFFFF" : COLORS.muted }]}>{lesson.number}</Txt>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Txt variant="label" style={[isCurrent && { fontFamily: FONTS.title }, locked && { color: COLORS.muted }]}>
          {lesson.title}
        </Txt>
        <Txt variant="caption" style={isCurrent && { color: COLORS.primary, fontFamily: FONTS.bodySemi }}>{sub}</Txt>
      </View>
      {!locked ? <Ionicons name="chevron-forward" size={20} color={isCurrent ? COLORS.primary : COLORS.faint} /> : null}
    </Pressable>
  );
}

function ModuleCard({ mod, index }: { mod: PathModule; index: number }) {
  const total = mod.lessons.length;

  if (mod.locked) {
    return (
      <Card style={styles.lockedCard}>
        <View style={{ flex: 1 }}>
          <Txt variant="title" style={{ fontSize: 17 }}>Module {index + 1} · {mod.title}</Txt>
          <Txt variant="caption" style={{ marginTop: 2 }}>{total} lessons · opens after the module before</Txt>
        </View>
        <Ionicons name="lock-closed-outline" size={22} color={COLORS.faint} accessibilityLabel="Locked" />
      </Card>
    );
  }

  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.moduleHead}>
        <Txt variant="title" style={{ flex: 1 }}>Module {index + 1} · {mod.title}</Txt>
        <Txt variant="caption">{mod.done} / {total} done</Txt>
      </View>
      <ProgressBar value={(mod.done / Math.max(1, total)) * 100} label={`${mod.title} progress`} />
      {mod.description ? <Txt variant="caption">{mod.description}</Txt> : null}
      <View style={{ gap: 4, marginTop: 6 }}>
        {mod.lessons.map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} />
        ))}
      </View>
    </Card>
  );
}

export default function LearnScreen() {
  const { user } = useLearnerAuth();
  const state = useAsync(() => loadLearningPath(user?.id ?? ""), [user?.id]);
  useRefreshOnFocus(state.refresh);

  if (state.loading && !state.data) return <Screen scroll={false}><LoadingView label="Loading your path…" /></Screen>;
  if (state.error && !state.data) return <Screen scroll={false}><ErrorView message={state.error} onRetry={() => void state.reload()} /></Screen>;
  if (!state.data) return null;

  const { app, modules } = state.data;

  return (
    <Screen onRefresh={() => void state.refresh()} refreshing={state.refreshing}>
      <View>
        <Txt variant="overline">{app.name}</Txt>
        <Txt variant="h1" style={{ marginTop: 2 }}>Your path</Txt>
      </View>

      {modules.length === 0 ? (
        <EmptyView
          icon="book-outline"
          title="No lessons yet"
          message="Lessons appear here as soon as they are published in the CMS."
        />
      ) : (
        modules.map((mod, i) => <ModuleCard key={mod.id} mod={mod} index={i} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  moduleHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: RADIUS.lg,
    minHeight: 56,
  },
  rowCurrent: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: SPACING.md,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: FONTS.display,
    fontSize: 15,
  },
  lockedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
});
