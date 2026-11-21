import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import {
  ArticleChip,
  Button,
  Card,
  ErrorView,
  Screen,
  SpeakButton,
  SpeedToggle,
  TopBar,
  Txt,
} from "../../components/ui";
import { fetchWord } from "../../api/vocabulary";
import { useAsync } from "../../lib/use-async";
import { meaningOf, pluralOf, splitArticle } from "../../lib/words";
import { getContentLanguage, useContentLanguage } from "../../lib/content-language";
import { ARTICLE_COLORS, COLORS, RADIUS, SPACING } from "../../styles/theme";
import { DetailSkeleton } from "../../components/Skeleton";

export default function WordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useContentLanguage();
  const state = useAsync(() => fetchWord(String(id)), [id]);

  if (state.loading && !state.data) return <Screen scroll={false}><DetailSkeleton label="Loading word" /></Screen>;
  if (state.error && !state.data) {
    return <Screen scroll={false}><ErrorView message={state.error} onRetry={() => void state.reload()} /></Screen>;
  }
  if (!state.data) return null;

  const word = state.data;
  const { article, noun } = splitArticle(word);
  const spoken = article ? `${article} ${noun}` : noun;
  const plural = pluralOf(word);
  const meanings = word.translations.map((t) => t.meaning).filter(Boolean);
  const germanExamples = word.examples.filter((e) => e.language.code === "de");
  const examples = germanExamples.length > 0 ? germanExamples : word.examples;

  // Translation of an example shares its translationGroupId.
  function translationOf(groupId: string | null): string | null {
    if (!groupId) return null;
    const others = word.examples.filter((e) => e.translationGroupId === groupId && e.language.code !== "de");
    return (others.find((e) => e.language.code === getContentLanguage()) ?? others.find((e) => e.language.code === "en") ?? others[0])?.text ?? null;
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <TopBar title="Word" />

      <Card style={styles.hero}>
        {word.imageUrl ? (
          <Image source={{ uri: word.imageUrl }} style={styles.image} accessibilityIgnoresInvertColors resizeMode="cover" />
        ) : null}
        <View style={styles.termRow}>
          {article ? <ArticleChip article={article} size="lg" /> : null}
          <Txt variant="h1" style={{ flexShrink: 1 }}>{noun}</Txt>
        </View>
        {article ? (
          <Txt variant="caption" style={{ color: ARTICLE_COLORS[article].fg }}>
            {ARTICLE_COLORS[article].label} noun
          </Txt>
        ) : word.partOfSpeech ? (
          <Txt variant="caption">{word.partOfSpeech}</Txt>
        ) : null}
        {word.pronunciation ? <Txt variant="body" style={{ color: COLORS.muted }}>[{word.pronunciation}]</Txt> : null}
        <View style={styles.audioRow}>
          <SpeakButton text={spoken} url={word.audioUrl} size={56} filled />
          <SpeedToggle />
        </View>
      </Card>

      {meanings.length > 0 ? (
        <Card style={{ gap: 6 }}>
          <Txt variant="overline">Meaning</Txt>
          <Txt variant="bodyLarge">{meaningOf(word) ?? meanings[0]}</Txt>
          {meanings.length > 1 ? (
            <Txt variant="caption">Also: {meanings.filter((m) => m !== meaningOf(word)).join(", ")}</Txt>
          ) : null}
        </Card>
      ) : null}

      {plural ? (
        <Card style={styles.inline}>
          <Txt variant="overline">Plural</Txt>
          <View style={styles.termRow}>
            <ArticleChip article="die" />
            <Txt variant="title" style={{ flexShrink: 1 }}>{plural.replace(/^die\s+/i, "")}</Txt>
            <SpeakButton text={`die ${plural.replace(/^die\s+/i, "")}`} size={36} />
          </View>
        </Card>
      ) : null}

      {examples.length > 0 ? (
        <Card style={{ gap: SPACING.md }}>
          <Txt variant="overline">Examples</Txt>
          {examples.slice(0, 5).map((ex) => {
            const translation = translationOf(ex.translationGroupId);
            return (
              <View key={ex.id} style={styles.example}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="body">{ex.text}</Txt>
                  {translation ? <Txt variant="caption">{translation}</Txt> : null}
                </View>
                {ex.language.code === "de" ? <SpeakButton text={ex.text} size={36} /> : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      {word.notes ? (
        <Card style={{ backgroundColor: COLORS.tipSoft, gap: 4 }}>
          <Txt variant="overline" style={{ color: COLORS.tipText }}>Tip</Txt>
          <Txt variant="body" style={{ color: COLORS.tipText }}>{word.notes}</Txt>
        </Card>
      ) : null}

      <Button title="Back to words" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: SPACING.sm, alignItems: "flex-start" },
  image: { width: "100%", aspectRatio: 16 / 9, borderRadius: RADIUS.lg, marginBottom: SPACING.sm },
  termRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexWrap: "wrap" },
  audioRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginTop: SPACING.sm },
  inline: { gap: SPACING.sm },
  example: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
});
