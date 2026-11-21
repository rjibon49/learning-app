import React from "react";
import { Linking, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Markdown from "react-native-markdown-display";

import { fetchLegal, type LegalDoc } from "../../api/legal";
import { Card, ErrorView, Screen, TopBar } from "../../components/ui";
import { LessonSkeleton } from "../../components/Skeleton";
import { useAsync } from "../../lib/use-async";
import { COLORS, FONTS } from "../../styles/theme";

/** Privacy policy or terms of use, shown inside the app (text from the CMS). */
export default function LegalScreen() {
  const { doc: raw } = useLocalSearchParams<{ doc: string }>();
  const doc: LegalDoc = raw === "terms" ? "terms" : "privacy";
  const fallbackTitle = doc === "terms" ? "Terms of use" : "Privacy policy";
  const state = useAsync(() => fetchLegal(doc), [doc]);

  return (
    <Screen onRefresh={() => void state.refresh()} refreshing={state.refreshing}>
      <TopBar title={state.data?.title ?? fallbackTitle} />
      {state.loading && !state.data ? (
        <LessonSkeleton />
      ) : state.error && !state.data ? (
        <ErrorView message={state.error} onRetry={() => void state.reload()} />
      ) : state.data ? (
        <Card>
          <Markdown
            style={markdownStyles}
            onLinkPress={(url) => {
              if (/^(https?:|mailto:)/i.test(url)) void Linking.openURL(url);
              return false;
            }}
          >
            {state.data.markdown}
          </Markdown>
        </Card>
      ) : null}
    </Screen>
  );
}

const markdownStyles = StyleSheet.create({
  body: { fontFamily: FONTS.body, fontSize: 16, lineHeight: 25, color: COLORS.ink },
  heading1: { fontFamily: FONTS.display, fontSize: 26, lineHeight: 32, marginBottom: 4 },
  heading2: { fontFamily: FONTS.title, fontSize: 19, lineHeight: 26, marginTop: 18, marginBottom: 4 },
  heading3: { fontFamily: FONTS.title, fontSize: 17, lineHeight: 24, marginTop: 12, marginBottom: 2 },
  strong: { fontFamily: FONTS.bodySemi, fontWeight: "normal" },
  link: { color: COLORS.primary, fontFamily: FONTS.bodySemi },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  paragraph: { marginTop: 4, marginBottom: 8 },
});
