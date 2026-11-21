import React, { useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { Button, EmptyView, ErrorView, IconButton, ProgressBar, Screen, Txt } from "../../components/ui";
import { getApiError } from "../../api/client";
import { answerMode, fetchQuiz, submitQuiz, type QuizQuestion, type QuizResult } from "../../api/quizzes";
import { useAsync } from "../../lib/use-async";
import { COLORS, FONTS, RADIUS, SPACING } from "../../styles/theme";
import { useLearnerAuth } from "../../lib/auth-context";
import { recordStep } from "../../lib/preferences";
import { QuizSkeleton } from "../../components/Skeleton";
import { maybeShowInterstitial } from "../../lib/ads";

const PROMPT: Record<string, string> = {
  MULTIPLE_CHOICE: "Choose the right answer",
  TRUE_FALSE: "True or false?",
  ARTICLE: "Choose the article",
  FILL_BLANK: "Fill in the blank",
  TRANSLATION_TO_TARGET: "Write it in German",
  TARGET_TO_TRANSLATION: "What does it mean?",
  LISTEN_AND_TYPE: "Type what you hear",
};

export default function QuizScreen() {
  const { user } = useLearnerAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const quizId = typeof id === "string" ? id : "";
  const state = useAsync(() => fetchQuiz(quizId), [quizId]);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);

  const quiz = state.data;
  const questions: QuizQuestion[] = useMemo(() => quiz?.questions ?? [], [quiz]);
  const unsupported = questions.some((q) => answerMode(q) === "unsupported");
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const current = question ? answers[question.id] ?? "" : "";

  function choose(value: string) {
    if (!question) return;
    void Haptics.selectionAsync().catch(() => undefined);
    setAnswers((a) => ({ ...a, [question.id]: value }));
  }

  async function next() {
    if (!question || !current.trim()) return;
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await submitQuiz(
        quizId,
        questions.map((q) => ({ questionId: q.id, answer: (answers[q.id] ?? "").trim() })),
      );
      void Haptics.notificationAsync(
        res.passed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => undefined);
      setResult(res);
      void recordStep(user?.id);
    } catch (e) {
      setSubmitError(getApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setSubmitError("");
  }

  const topBar = (
    <View style={styles.topBar}>
      <IconButton icon="close" label="Leave quiz" onPress={() => router.back()} />
      {questions.length > 0 && !result ? (
        <>
          <View style={{ flex: 1 }}>
            <ProgressBar value={(index / questions.length) * 100} height={10} label="Quiz progress" />
          </View>
          <Txt variant="caption" style={{ fontFamily: FONTS.bodySemi, marginRight: SPACING.md }}>
            {index + 1}/{questions.length}
          </Txt>
        </>
      ) : (
        <Txt variant="label" numberOfLines={1} style={{ flex: 1 }}>{quiz?.title ?? ""}</Txt>
      )}
    </View>
  );

  if (state.loading && !quiz) return <Screen scroll={false} background={COLORS.surface} edges={["top", "bottom"]}>{topBar}<QuizSkeleton /></Screen>;
  if (state.error && !quiz) return <Screen scroll={false} background={COLORS.surface} edges={["top", "bottom"]}>{topBar}<ErrorView message={state.error} onRetry={() => void state.reload()} /></Screen>;
  if (!quiz) return null;

  if (questions.length === 0 || unsupported) {
    return (
      <Screen scroll={false} background={COLORS.surface} edges={["top", "bottom"]}>
        {topBar}
        <EmptyView
          icon="construct-outline"
          title={questions.length === 0 ? "No questions yet" : "Not available in the app yet"}
          message={
            questions.length === 0
              ? "This quiz has no questions yet."
              : "This quiz uses a question type (matching, speaking or ordering) the app cannot check yet."
          }
          action={<Button title="Back" variant="secondary" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  if (result) {
    const pct = Math.round(Number(result.percentage));
    return (
      <Screen scroll={false} background={COLORS.surface} edges={["top", "bottom"]} contentStyle={{ justifyContent: "center" }}>
        <View style={[styles.resultIcon, { backgroundColor: result.passed ? COLORS.correctSoft : COLORS.warnSoft }]}>
          <Ionicons name={result.passed ? "trophy" : "refresh"} size={42} color={result.passed ? COLORS.correct : COLORS.warnText} />
        </View>
        <Txt variant="h1" style={{ textAlign: "center" }}>{result.passed ? "Bestanden! Passed" : "Fast! Almost"}</Txt>
        <Txt style={styles.score}>{pct}%</Txt>
        <Txt variant="body" style={{ textAlign: "center", color: COLORS.muted }}>
          {result.score} of {result.total} points.{" "}
          {result.passed
            ? "Great work — keep the streak going."
            : `You need ${quiz.passingScore ?? 60}% to pass. Review the lesson and try again.`}
        </Txt>
        <View style={{ gap: SPACING.md, marginTop: SPACING.lg }}>
          {!result.passed ? <Button title="Try again" onPress={restart} /> : null}
          <Button
            title="Done"
            variant={result.passed ? "primary" : "secondary"}
            onPress={() => {
              maybeShowInterstitial();
              router.back();
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!question) return null;
  const mode = answerMode(question);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen
        background={COLORS.surface}
        edges={["top", "bottom"]}
        footer={
          <View style={styles.footer}>
            {submitError ? <Txt variant="caption" style={{ color: COLORS.wrongText, marginBottom: 8 }}>{submitError}</Txt> : null}
            <Button
              title={isLast ? "Finish quiz" : "Next question"}
              disabled={!current.trim()}
              loading={submitting}
              onPress={() => void next()}
            />
          </View>
        }
      >
        {topBar}
        <Txt variant="overline">{PROMPT[question.questionType] ?? "Answer the question"}</Txt>
        {question.questionText ? <Txt variant="h2" style={{ lineHeight: 32 }}>{question.questionText}</Txt> : null}
        {question.imageUrl ? (
          <Image source={{ uri: question.imageUrl }} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : null}

        {mode === "typed" ? (
          <TextInput
            value={current}
            onChangeText={choose}
            placeholder="Type your answer"
            placeholderTextColor={COLORS.faint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void next()}
            accessibilityLabel="Your answer"
            style={styles.input}
          />
        ) : (
          <View style={{ gap: 10 }} accessibilityRole="radiogroup">
            {[...question.options].sort((a, b) => a.sortOrder - b.sortOrder).map((option) => {
              const value = mode === "option-id" ? option.id : option.text;
              const selected = current === value;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => choose(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && { opacity: 0.85 }]}
                >
                  <Txt style={[styles.optionText, selected && { color: COLORS.primary }]}>{option.text}</Txt>
                  {selected ? <Ionicons name="radio-button-on" size={22} color={COLORS.primary} /> : <Ionicons name="radio-button-off" size={22} color={COLORS.borderStrong} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
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
  image: {
    width: "100%",
    height: 180,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.ground,
  },
  option: {
    minHeight: 56,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTint,
  },
  optionText: {
    fontFamily: FONTS.title,
    fontSize: 17,
    color: COLORS.ink,
    flexShrink: 1,
  },
  input: {
    minHeight: 56,
    borderWidth: 2,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    fontFamily: FONTS.bodyMedium,
    fontSize: 18,
    color: COLORS.ink,
  },
  footer: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  resultIcon: {
    alignSelf: "center",
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  score: {
    fontFamily: FONTS.display,
    fontSize: 56,
    lineHeight: 64,
    color: COLORS.ink,
    textAlign: "center",
  },
});
