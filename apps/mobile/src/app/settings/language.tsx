import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card, ErrorView, LoadingView, Screen, TopBar, Txt } from "../../components/ui";
import {
  FALLBACK_LANGUAGE,
  fetchExplanationLanguages,
  setContentLanguage,
  useContentLanguage,
} from "../../lib/content-language";
import { languageLabel } from "../../lib/language-names";
import { useAsync } from "../../lib/use-async";
import { COLORS, SPACING } from "../../styles/theme";

/** Pick the language lessons are explained in. German stays German. */
export default function LanguageScreen() {
  const current = useContentLanguage();
  const state = useAsync(fetchExplanationLanguages, []);

  async function choose(code: string) {
    await setContentLanguage(code);
    router.back();
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <TopBar title="Explanation language" />
      <Txt variant="body" style={{ color: COLORS.muted }}>
        Lessons, word meanings and tips are shown in this language. German words and sentences always stay German.
      </Txt>

      {state.loading && !state.data ? (
        <LoadingView />
      ) : state.error && !state.data ? (
        <ErrorView message={state.error} onRetry={() => void state.reload()} />
      ) : (
        <Card style={{ paddingVertical: SPACING.xs }}>
          {(state.data ?? []).map((lang, i) => {
            const selected = lang.code === current;
            const label = languageLabel(lang.code, lang.nativeName);
            return (
              <View key={lang.code}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  onPress={() => void choose(lang.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={label === lang.name ? label : `${label}, ${lang.name}`}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Txt variant="label">{label}</Txt>
                    {label !== lang.name ? <Txt variant="caption">{lang.name}</Txt> : null}
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} /> : null}
                </Pressable>
              </View>
            );
          })}
        </Card>
      )}

      <Txt variant="caption">
        If a lesson is not translated into your language yet, it is shown in {languageLabel(FALLBACK_LANGUAGE)}.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: SPACING.md },
  divider: { height: 1, backgroundColor: COLORS.border },
});
