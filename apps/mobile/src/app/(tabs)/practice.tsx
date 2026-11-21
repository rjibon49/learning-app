import React from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card, EmptyView, ErrorView, IconTile, Screen, Txt } from "../../components/ui";
import { getCurrentApp } from "../../api/app";
import { fetchDecks } from "../../api/practice";
import { fetchDashboard } from "../../api/progress";
import { fetchQuizzes } from "../../api/quizzes";
import { useAsync, useRefreshOnFocus } from "../../lib/use-async";
import { COLORS, SPACING } from "../../styles/theme";
import { ListSkeleton } from "../../components/Skeleton";

const LEVEL_LABEL = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" } as const;

export default function PracticeScreen() {
  const state = useAsync(async () => {
    const app = await getCurrentApp();
    const [decks, quizzes, dashboard] = await Promise.all([
      fetchDecks(app.id),
      fetchQuizzes(app.id).catch(() => []),
      fetchDashboard(),
    ]);
    return { decks, quizzes, due: dashboard.vocabulary.due };
  }, []);
  useRefreshOnFocus(state.refresh);

  if (state.loading && !state.data) return <Screen scroll={false}><ListSkeleton label="Loading practice" rows={4} /></Screen>;
  if (state.error && !state.data) return <Screen scroll={false}><ErrorView message={state.error} onRetry={() => void state.reload()} /></Screen>;
  if (!state.data) return null;

  const { decks, quizzes, due } = state.data;

  return (
    <Screen onRefresh={() => void state.refresh()} refreshing={state.refreshing}>
      <Txt variant="h1">Practice</Txt>

      <Card style={styles.dueCard}>
        <View style={styles.dueRow}>
          <IconTile icon="refresh" bg={COLORS.correctSoft} color={COLORS.correct} size={48} />
          <View style={{ flex: 1 }}>
            <Txt variant="title">Daily review</Txt>
            <Txt variant="caption" style={{ fontSize: 14 }}>
              {due > 0
                ? `${due} word${due === 1 ? "" : "s"} ready to review. A few minutes a day keeps them in memory.`
                : "Nothing due right now. Learn new words in a deck or lesson."}
            </Txt>
          </View>
        </View>
        <Button
          title={due > 0 ? "Start review" : "All caught up"}
          disabled={due === 0}
          onPress={() => router.push({ pathname: "/review", params: { mode: "due" } })}
        />
      </Card>

      <Txt variant="title">Flashcard decks</Txt>
      {decks.length === 0 ? (
        <EmptyView icon="albums-outline" title="No decks yet" message="Decks appear here once they are published in the CMS." />
      ) : (
        decks.map((deck) => {
          const count = deck._count?.items ?? 0;
          return (
            <Card
              key={deck.id}
              style={styles.row}
              onPress={() => router.push({ pathname: "/review", params: { mode: "deck", deckId: deck.id, title: deck.title } })}
              accessibilityLabel={`${deck.title}, ${count} cards`}
            >
              <IconTile icon="albums" bg={COLORS.primarySoft} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Txt variant="label">{deck.title}</Txt>
                <Txt variant="caption">
                  {count} card{count === 1 ? "" : "s"} · {LEVEL_LABEL[deck.difficulty] ?? deck.difficulty}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.faint} />
            </Card>
          );
        })
      )}

      {quizzes.length > 0 ? (
        <>
          <Txt variant="title" style={{ marginTop: SPACING.sm }}>Quizzes</Txt>
          {quizzes.map((quiz) => (
            <Card
              key={quiz.id}
              style={styles.row}
              onPress={() => router.push(`/quiz/${quiz.id}`)}
              accessibilityLabel={`Quiz: ${quiz.title}`}
            >
              <IconTile icon="help-circle-outline" bg="#FFF1E6" color="#C2410C" />
              <View style={{ flex: 1 }}>
                <Txt variant="label">{quiz.title}</Txt>
                <Txt variant="caption">
                  {quiz._count?.questions ? `${quiz._count.questions} questions · ` : ""}
                  {LEVEL_LABEL[quiz.difficulty] ?? quiz.difficulty}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.faint} />
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dueCard: {
    gap: SPACING.lg,
  },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
});
