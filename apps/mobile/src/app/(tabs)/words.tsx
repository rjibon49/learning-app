import React, { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ArticleChip, Chip, EmptyView, ErrorView, LoadingView, SpeakButton, Txt } from "../../components/ui";
import { getCurrentApp } from "../../api/app";
import { fetchAppWords, type WordEntry } from "../../api/vocabulary";
import { useAsync } from "../../lib/use-async";
import { meaningOf, splitArticle } from "../../lib/words";
import { useContentLanguage } from "../../lib/content-language";
import { COLORS, FONTS, RADIUS, SPACING } from "../../styles/theme";

type ArticleFilter = "all" | "der" | "die" | "das" | "other";

const ARTICLE_FILTERS: { key: ArticleFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "der", label: "der" },
  { key: "die", label: "die" },
  { key: "das", label: "das" },
  { key: "other", label: "Verbs & more" },
];

/** Lower-case, no umlaut/ß differences, so "uber" finds "über". */
function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function WordRow({ word }: { word: WordEntry }) {
  const { article, noun } = splitArticle(word);
  const meaning = meaningOf(word);
  const spoken = article ? `${article} ${noun}` : noun;

  return (
    <Pressable
      onPress={() => router.push(`/word/${word.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${spoken}${meaning ? `, ${meaning}` : ""}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.termLine}>
          {article ? <ArticleChip article={article} /> : null}
          <Txt variant="title" style={{ flexShrink: 1 }} numberOfLines={1}>{noun}</Txt>
        </View>
        {meaning ? <Txt variant="caption" numberOfLines={1}>{meaning}</Txt> : null}
      </View>
      <SpeakButton text={spoken} url={word.audioUrl} size={40} />
    </Pressable>
  );
}

export default function WordsScreen() {
  const language = useContentLanguage();
  const [query, setQuery] = useState("");
  const [article, setArticle] = useState<ArticleFilter>("all");
  const [category, setCategory] = useState<string | null>(null);

  const state = useAsync(async () => {
    const app = await getCurrentApp();
    return fetchAppWords(app.id);
  }, []);

  const words = useMemo(() => state.data ?? [], [state.data]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of words) if (w.category) map.set(w.category.id, w.category.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [words]);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return words
      .filter((w) => {
        const a = splitArticle(w).article;
        if (article === "other" && a) return false;
        if (article !== "all" && article !== "other" && a !== article) return false;
        if (category && w.category?.id !== category) return false;
        if (!q) return true;
        return (
          fold(w.term).includes(q) ||
          w.translations.some((t) => fold(t.meaning).includes(q))
        );
      })
      .sort((x, y) => splitArticle(x).noun.localeCompare(splitArticle(y).noun, "de"));
  }, [words, query, article, category]);

  async function reloadFresh() {
    const app = await getCurrentApp();
    await fetchAppWords(app.id, true);
    await state.refresh();
  }

  if (state.loading && !state.data) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <LoadingView label="Loading words…" />
      </SafeAreaView>
    );
  }
  if (state.error && !state.data) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ErrorView message={state.error} onRetry={() => void state.reload()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={filtered}
        keyExtractor={(w) => w.id}
        extraData={language}
        renderItem={({ item }) => <WordRow word={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        initialNumToRender={20}
        windowSize={7}
        refreshControl={
          <RefreshControl refreshing={state.refreshing} onRefresh={() => void reloadFresh()} colors={[COLORS.primary]} />
        }
        ListHeaderComponent={
          <View style={{ gap: SPACING.md, marginBottom: SPACING.md }}>
            <View style={styles.titleRow}>
              <Txt variant="h1">Words</Txt>
              <Txt variant="caption">{words.length} words</Txt>
            </View>

            <View style={styles.search}>
              <Ionicons name="search" size={20} color={COLORS.faint} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search German or English"
                placeholderTextColor={COLORS.faint}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                accessibilityLabel="Search words"
                style={styles.searchInput}
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
                  <Ionicons name="close-circle" size={20} color={COLORS.faint} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {ARTICLE_FILTERS.map((f) => (
                <Chip key={f.key} label={f.label} selected={article === f.key} onPress={() => setArticle(f.key)} />
              ))}
            </ScrollView>

            {categories.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                <Chip label="All topics" selected={category === null} onPress={() => setCategory(null)} />
                {categories.map(([id, name]) => (
                  <Chip key={id} label={name} selected={category === id} onPress={() => setCategory(id)} />
                ))}
              </ScrollView>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          words.length === 0 ? (
            <EmptyView
              icon="library-outline"
              title="No words yet"
              message="Words appear here when they are added to this app's lessons or flashcard decks in the CMS."
            />
          ) : (
            <EmptyView icon="search-outline" title="No matching words" message="Try another spelling or clear the filters." />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.ground },
  list: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 16, color: COLORS.ink, paddingVertical: 10 },
  chips: { gap: SPACING.sm, paddingRight: SPACING.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  termLine: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  separator: { height: SPACING.sm },
});
