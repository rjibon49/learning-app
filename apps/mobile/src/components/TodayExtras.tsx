import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { WordEntry } from "../api/vocabulary";
import type { Dashboard } from "../api/progress";
import { utcDayKey } from "../api/progress";
import type { LearningPath } from "../lib/learning-path";
import { meaningOf, splitArticle } from "../lib/words";
import { COLORS, FONTS, RADIUS, SPACING } from "../styles/theme";
import { ArticleChip, Card, ProgressBar, SpeakButton, Txt } from "./ui";

const DAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function lastSevenDays() {
  const now = Date.now();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    return { key: utcDayKey(d), label: DAY[d.getUTCDay()], today: i === 6 };
  });
}

/** Last 7 days, today last; gold = practised. */
export function WeekStrip({ active }: { active: Set<string> }) {
  const days = lastSevenDays();

  return (
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
              {done ? <Ionicons name="flame" size={14} color="#5A3D00" /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Words learned · mastered · lessons done, each tappable. */
export function StatsRow({ dashboard, path }: { dashboard: Dashboard; path: LearningPath }) {
  const items = [
    { value: dashboard.vocabulary.learned, label: "Words learned", icon: "library-outline" as const, go: "/words" as const },
    { value: dashboard.vocabulary.mastered, label: "Mastered", icon: "trophy-outline" as const, go: "/progress" as const },
    { value: `${path.doneLessons}/${path.totalLessons}`, label: "Lessons", icon: "book-outline" as const, go: "/learn" as const },
  ];
  return (
    <View style={styles.stats}>
      {items.map((s) => (
        <Pressable
          key={s.label}
          onPress={() => router.push(s.go)}
          accessibilityRole="button"
          accessibilityLabel={`${s.label}: ${s.value}`}
          style={({ pressed }) => [styles.stat, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name={s.icon} size={18} color={COLORS.primary} />
          <Txt style={styles.statValue}>{s.value}</Txt>
          <Txt variant="caption" numberOfLines={1}>{s.label}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

/** Same word all day, a new one tomorrow. */
export function pickWordOfDay(words: WordEntry[]): WordEntry | null {
  if (words.length === 0) return null;
  const day = Math.floor(Date.now() / 86400000);
  return words[(day * 7919) % words.length] ?? null;
}

export function WordOfDay({ word }: { word: WordEntry }) {
  const { article, noun } = splitArticle(word);
  const spoken = article ? `${article} ${noun}` : noun;
  const meaning = meaningOf(word);
  const example = word.examples.find((e) => e.language.code === "de")?.text ?? null;

  return (
    <Card onPress={() => router.push(`/word/${word.id}`)} accessibilityLabel={`Word of the day: ${spoken}, ${meaning ?? ""}`} style={{ gap: SPACING.sm }}>
      <View style={styles.wodHead}>
        <Ionicons name="sunny-outline" size={18} color={COLORS.goldIcon} />
        <Txt variant="overline" style={{ flex: 1 }}>Word of the day</Txt>
        <Ionicons name="chevron-forward" size={18} color={COLORS.faint} />
      </View>
      <View style={styles.wodRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.inline}>
            {article ? <ArticleChip article={article} /> : null}
            <Txt variant="h2" style={{ flexShrink: 1 }} numberOfLines={1}>{noun}</Txt>
          </View>
          {meaning ? <Txt variant="body" style={{ color: COLORS.muted }}>{meaning}</Txt> : null}
        </View>
        <SpeakButton text={spoken} url={word.audioUrl} size={48} />
      </View>
      {example ? <Txt variant="caption" style={{ fontSize: 14 }}>„{example}“</Txt> : null}
    </Card>
  );
}

/** Whole-course progress + the next lessons. */
export function PathCard({ path }: { path: LearningPath }) {
  const pct = path.totalLessons ? (path.doneLessons / path.totalLessons) * 100 : 0;
  const current = path.modules.find((m) => m.lessons.some((l) => l.status === "current"));
  const upcoming = current
    ? current.lessons.filter((l) => l.status === "current" || l.status === "open").slice(0, 3)
    : [];

  return (
    <Card style={{ gap: SPACING.md }}>
      <View style={styles.pathHead}>
        <Txt variant="title" style={{ flex: 1 }} numberOfLines={1}>{path.app.name}</Txt>
        <Txt variant="caption">{Math.round(pct)}%</Txt>
      </View>
      <ProgressBar value={pct} label="Course progress" />
      <Txt variant="caption">
        {path.doneLessons} of {path.totalLessons} lessons · {path.modules.filter((m) => m.done === m.lessons.length && m.lessons.length > 0).length} of {path.modules.length} modules done
      </Txt>

      {current && upcoming.length > 0 ? (
        <View style={{ gap: SPACING.xs }}>
          <Txt variant="overline">Next in {current.title}</Txt>
          {upcoming.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => router.push(`/lesson/${l.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Lesson ${l.number}: ${l.title}`}
              style={({ pressed }) => [styles.lesson, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.num, l.status === "current" && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                <Txt style={[styles.numText, l.status === "current" && { color: "#FFFFFF" }]}>{l.number}</Txt>
              </View>
              <Txt variant="label" style={{ flex: 1 }} numberOfLines={1}>{l.title}</Txt>
              {l.estimatedMinutes ? <Txt variant="caption">{l.estimatedMinutes} min</Txt> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable onPress={() => router.push("/learn")} accessibilityRole="button" style={styles.link}>
        <Txt variant="label" style={{ color: COLORS.primary }}>See all lessons</Txt>
        <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: "row", justifyContent: "space-between" },
  day: { alignItems: "center", gap: 6 },
  dot: { width: 30, height: 30, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  stats: { flexDirection: "row", gap: SPACING.sm },
  stat: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 2,
  },
  statValue: { fontFamily: FONTS.display, fontSize: 22, lineHeight: 28, color: COLORS.ink },
  wodHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  wodRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  inline: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  pathHead: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  lesson: { flexDirection: "row", alignItems: "center", gap: SPACING.md, minHeight: 44 },
  num: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { fontFamily: FONTS.title, fontSize: 13, color: COLORS.muted },
  link: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
});
