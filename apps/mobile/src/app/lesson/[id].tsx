import React, { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Markdown from "react-native-markdown-display";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import {
  ArticleChip,
  Button,
  Card,
  ErrorView,
  IconButton,
  LoadingView,
  Screen,
  SpeakButton,
  Txt,
} from "../../components/ui";
import { getCurrentApp } from "../../api/app";
import { getApiError } from "../../api/client";
import { fetchLesson, type LessonDetail } from "../../api/courses";
import { fetchLessonWords } from "../../api/practice";
import { saveLessonProgress } from "../../api/progress";
import { fetchQuizzes } from "../../api/quizzes";
import { MEANING_LANGUAGE } from "../../config";
import { useLearnerAuth } from "../../lib/auth-context";
import { parseSpeechLink, speakGerman } from "../../lib/german-speech";
import { markLessonCompleted } from "../../lib/lesson-progress";
import { useAsync } from "../../lib/use-async";
import { meaningOf, splitArticle } from "../../lib/words";
import { COLORS, FONTS, RADIUS, SPACING } from "../../styles/theme";

/** Lesson text in the learner's language, then German, then anything. */
function pickContent(lesson: LessonDetail) {
  const t = lesson.translations;
  return (
    t.find((x) => x.language.code === MEANING_LANGUAGE) ??
    t.find((x) => x.language.code === "de") ??
    t[0] ??
    null
  );
}

async function onMarkdownLink(url: string): Promise<boolean> {
  const german = parseSpeechLink(url);
  if (german !== null) {
    await speakGerman(german).catch(() => undefined);
    return false;
  }
  try {
    if (new URL(url).protocol === "https:") await Linking.openURL(url);
  } catch {
    // Ignore invalid links.
  }
  return false;
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = typeof id === "string" ? id : "";
  const { user } = useLearnerAuth();
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finishError, setFinishError] = useState("");

  const state = useAsync(async () => {
    const [lesson, app] = await Promise.all([fetchLesson(lessonId), getCurrentApp()]);
    const [words, quizzes] = await Promise.all([
      fetchLessonWords(app.id, lessonId).catch(() => []),
      fetchQuizzes(app.id, lessonId).catch(() => []),
    ]);
    return { lesson, words, quiz: quizzes[0] ?? null };
  }, [lessonId]);

  async function finish() {
    if (finishing || !user) return;
    setFinishing(true);
    setFinishError("");
    try {
      await saveLessonProgress(lessonId, 100);
      await markLessonCompleted(user.id, lessonId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setFinished(true);
    } catch (e) {
      setFinishError(getApiError(e));
    } finally {
      setFinishing(false);
    }
  }

  const header = (
    <View style={styles.topBar}>
      <IconButton icon="close" label="Close lesson" onPress={() => router.back()} />
      <Txt variant="label" numberOfLines={1} style={{ flex: 1 }}>
        {state.data?.lesson.title ?? ""}
      </Txt>
    </View>
  );

  if (state.loading && !state.data) {
    return <Screen scroll={false} background={COLORS.surface}>{header}<LoadingView label="Opening lesson…" /></Screen>;
  }
  if (state.error && !state.data) {
    return <Screen scroll={false} background={COLORS.surface}>{header}<ErrorView message={state.error} onRetry={() => void state.reload()} /></Screen>;
  }
  if (!state.data) return null;

  const { lesson, words, quiz } = state.data;
  const content = pickContent(lesson);

  if (finished) {
    return (
      <Screen background={COLORS.surface} edges={["top", "bottom"]} contentStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View style={styles.doneIcon}>
          <Ionicons name="trophy" size={44} color={COLORS.goldIcon} />
        </View>
        <Txt variant="h1" style={{ textAlign: "center" }}>Super gemacht!</Txt>
        <Txt variant="body" style={{ textAlign: "center", color: COLORS.muted }}>
          You finished “{lesson.title}”.{words.length > 0 ? ` Practise its ${words.length} words now so they stick.` : ""}
        </Txt>
        <View style={{ gap: SPACING.md, marginTop: SPACING.lg }}>
          {words.length > 0 ? (
            <Button
              title="Practise these words"
              icon="albums-outline"
              onPress={() => router.replace({ pathname: "/review", params: { mode: "lesson", lessonId, title: lesson.title } })}
            />
          ) : null}
          {quiz ? (
            <Button
              title="Take the lesson quiz"
              variant={words.length > 0 ? "secondary" : "primary"}
              onPress={() => router.replace(`/quiz/${quiz.id}`)}
            />
          ) : null}
          <Button title="Back to my path" variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      background={COLORS.surface}
      edges={["top", "bottom"]}
      footer={
        <View style={styles.footer}>
          {finishError ? <Txt variant="caption" style={{ color: COLORS.wrongText, marginBottom: 8 }}>{finishError}</Txt> : null}
          <Button title="Finish lesson" onPress={() => void finish()} loading={finishing} />
        </View>
      }
    >
      {header}

      <View>
        <Txt variant="overline">
          Lesson {lesson.sortOrder + 1}
          {lesson.estimatedMinutes ? ` · ${lesson.estimatedMinutes} min` : ""}
        </Txt>
        <Txt variant="h1" style={{ marginTop: 4 }}>{content?.title?.trim() || lesson.title}</Txt>
      </View>

      {content ? (
        <Markdown style={markdownStyles} onLinkPress={(url) => { void onMarkdownLink(url); return false; }}>
          {content.content}
        </Markdown>
      ) : (
        <Card style={{ backgroundColor: COLORS.tipSoft }}>
          <Txt variant="body" style={{ color: COLORS.tipText }}>The text for this lesson is not written yet. You can still practise its words below.</Txt>
        </Card>
      )}

      {words.length > 0 ? (
        <View style={{ gap: SPACING.md }}>
          <Txt variant="title">Words in this lesson</Txt>
          {words.map((word) => {
            const { article, noun } = splitArticle(word);
            const meaning = meaningOf(word);
            return (
              <View key={word.id} style={styles.wordRow}>
                <SpeakButton text={article ? `${article} ${noun}` : noun} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {article ? <ArticleChip article={article} /> : null}
                    <Txt style={styles.wordTerm}>{noun}</Txt>
                  </View>
                  {meaning ? <Txt variant="caption" style={{ fontSize: 14 }}>{meaning}</Txt> : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

const markdownStyles = StyleSheet.create({
  body: { fontFamily: FONTS.body, fontSize: 18, lineHeight: 29, color: COLORS.ink },
  heading1: { fontFamily: FONTS.display, fontSize: 26, lineHeight: 32, marginTop: 8, marginBottom: 6 },
  heading2: { fontFamily: FONTS.display, fontSize: 22, lineHeight: 28, marginTop: 14, marginBottom: 6 },
  heading3: { fontFamily: FONTS.title, fontSize: 19, lineHeight: 26, marginTop: 12, marginBottom: 4 },
  strong: { fontFamily: FONTS.bodySemi, fontWeight: "normal" },
  em: { fontStyle: "italic" },
  link: { color: COLORS.primary, textDecorationLine: "none", fontFamily: FONTS.bodySemi },
  blockquote: {
    backgroundColor: COLORS.tipSoft,
    borderLeftWidth: 0,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginVertical: 8,
  },
  bullet_list: { marginVertical: 6 },
  ordered_list: { marginVertical: 6 },
  list_item: { marginVertical: 3 },
  table: { borderColor: COLORS.border, borderRadius: RADIUS.md },
  th: { padding: 8, backgroundColor: COLORS.primaryTint },
  td: { padding: 8 },
  code_inline: { fontFamily: FONTS.bodySemi, backgroundColor: COLORS.primarySoft, color: COLORS.primary, borderRadius: 6, paddingHorizontal: 4 },
  hr: { backgroundColor: COLORS.border, marginVertical: 12 },
});

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginLeft: -SPACING.md,
    marginTop: -SPACING.md,
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  wordTerm: {
    fontFamily: FONTS.title,
    fontSize: 18,
    color: COLORS.ink,
  },
  footer: {
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
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
