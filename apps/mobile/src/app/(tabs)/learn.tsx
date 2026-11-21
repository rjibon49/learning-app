import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card, EmptyView, ErrorView, ProgressBar, Screen, Txt } from "../../components/ui";
import { useLearnerAuth } from "../../lib/auth-context";
import { loadLearningPath, type PathCourse, type PathLesson, type PathModule } from "../../lib/learning-path";
import { useAsync, useRefreshOnFocus } from "../../lib/use-async";
import { COLORS, FONTS, RADIUS, SPACING } from "../../styles/theme";
import { CoursesSkeleton } from "../../components/Skeleton";

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
          <Txt variant="caption" style={{ marginTop: 2 }}>{total} lessons · opens after the module before in this course</Txt>
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

/** Horizontal list of all courses; the chosen one is shown below. */
function CoursePicker({
  courses,
  selected,
  onSelect,
}: {
  courses: PathCourse[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      style={{ marginHorizontal: -SPACING.xl, flexGrow: 0 }}
      accessibilityRole="tablist"
    >
      {courses.map((c) => {
        const active = c.id === selected;
        const finished = c.totalLessons > 0 && c.doneLessons === c.totalLessons;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${c.title}, ${c.doneLessons} of ${c.totalLessons} lessons done`}
            style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.8 }]}
          >
            {finished ? <Ionicons name="checkmark-circle" size={16} color={active ? "#FFFFFF" : COLORS.correct} /> : null}
            <Txt style={[styles.chipText, active && { color: "#FFFFFF" }]} numberOfLines={1}>
              {c.title.split(" · ")[0]}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function CourseHeader({ course, number, count }: { course: PathCourse; number: number; count: number }) {
  const pct = (course.doneLessons / Math.max(1, course.totalLessons)) * 100;
  return (
    <Card style={{ gap: SPACING.sm }}>
      <Txt variant="overline">Course {number} of {count}</Txt>
      <Txt variant="h2">{course.title}</Txt>
      {course.description ? <Txt variant="caption" style={{ fontSize: 14 }}>{course.description}</Txt> : null}
      <ProgressBar value={pct} label={`${course.title} progress`} />
      <Txt variant="caption">
        {course.doneLessons} of {course.totalLessons} lessons · {course.modules.length} modules
      </Txt>
    </Card>
  );
}

export default function LearnScreen() {
  const { user } = useLearnerAuth();
  const state = useAsync(() => loadLearningPath(user?.id ?? ""), [user?.id]);
  useRefreshOnFocus(state.refresh);
  const [chosen, setChosen] = useState<string | null>(null);

  if (state.loading && !state.data) return <Screen scroll={false}><CoursesSkeleton /></Screen>;
  if (state.error && !state.data) return <Screen scroll={false}><ErrorView message={state.error} onRetry={() => void state.reload()} /></Screen>;
  if (!state.data) return null;

  const { app, courses, next } = state.data;
  const selectedId =
    (chosen && courses.some((c) => c.id === chosen) ? chosen : null) ?? next?.courseId ?? courses[0]?.id ?? "";
  const index = courses.findIndex((c) => c.id === selectedId);
  const course = courses[index];

  return (
    <Screen onRefresh={() => void state.refresh()} refreshing={state.refreshing}>
      <View>
        <Txt variant="overline">{app.name}</Txt>
        <Txt variant="h1" style={{ marginTop: 2 }}>Courses</Txt>
      </View>

      {!course ? (
        <EmptyView
          icon="book-outline"
          title="No lessons yet"
          message="Lessons appear here as soon as they are published in the CMS."
        />
      ) : (
        <>
          {courses.length > 1 ? <CoursePicker courses={courses} selected={course.id} onSelect={setChosen} /> : null}
          <CourseHeader course={course} number={index + 1} count={courses.length} />
          {course.modules.map((mod, i) => <ModuleCard key={mod.id} mod={mod} index={i} />)}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
    color: COLORS.ink,
  },
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
