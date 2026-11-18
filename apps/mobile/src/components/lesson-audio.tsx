import React, { useState, type ReactNode } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { RenderRules } from "react-native-markdown-display";

import { play, playAll, stopAudio, useNowPlaying, useQueueRunning, type PlayItem } from "../lib/audio";
import { parseSpeechLink } from "../lib/speech-links";
import { COLORS, FONTS, RADIUS, SPACING } from "../styles/theme";
import { Button, Card, GermanVoiceNotice, SpeakButton, SpeedToggle, Txt } from "./ui";

/** A German phrase inside lesson text: tap to hear it (highlighted while playing). */
function SpeakLink({ text, children }: { text: string; children: ReactNode }) {
  const playing = useNowPlaying() === text;
  return (
    <Text
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        void play({ text, key: text }).catch(() => undefined);
      }}
      accessibilityRole="button"
      accessibilityLabel={`German: ${text}. Tap to hear it.`}
      style={[styles.speakLink, playing && styles.speakLinkPlaying]}
      suppressHighlighting
    >
      {children}
      <Text style={styles.speakIcon}>
        {" "}
        <Ionicons name={playing ? "volume-high" : "volume-medium-outline"} size={15} color={COLORS.primary} />
      </Text>
    </Text>
  );
}

/** Markdown render rules: speech links play German; https links open outside. */
export const lessonMarkdownRules: RenderRules = {
  link: (node, children) => {
    const href = String(node.attributes?.href ?? "");
    const german = parseSpeechLink(href);
    if (german !== null) {
      return (
        <SpeakLink key={node.key} text={german}>
          {children}
        </SpeakLink>
      );
    }
    return (
      <Text
        key={node.key}
        style={styles.webLink}
        onPress={() => {
          try {
            if (new URL(href).protocol === "https:") void Linking.openURL(href);
          } catch {
            // Ignore invalid links.
          }
        }}
      >
        {children}
      </Text>
    );
  },
};

const PREVIEW = 6;

/**
 * "Listen & repeat": every German phrase of the lesson in one place,
 * with Play all and Normal / Slow speed. Recordings uploaded in the CMS
 * (lesson audio resources) are listed first.
 */
export function ListenPanel({
  phrases,
  recordings,
}: {
  phrases: string[];
  recordings: { id: string; title: string; url: string }[];
}) {
  const [open, setOpen] = useState(false);
  const queueRunning = useQueueRunning("lesson");
  if (phrases.length === 0 && recordings.length === 0) return null;

  const visible = open ? phrases : phrases.slice(0, PREVIEW);
  const items: PlayItem[] = [
    ...recordings.map((r) => ({ text: r.title, url: r.url, key: `rec:${r.id}` })),
    ...phrases.map((p) => ({ text: p, key: p })),
  ];

  return (
    <Card style={styles.panel}>
      <View style={styles.panelHead}>
        <View style={{ flex: 1 }}>
          <Txt variant="title">Listen &amp; repeat</Txt>
          <Txt variant="caption">
            {phrases.length} German phrase{phrases.length === 1 ? "" : "s"} · tap any blue German text to hear it
          </Txt>
        </View>
      </View>

      <View style={styles.controls}>
        <SpeedToggle />
        <Button
          title={queueRunning ? "Stop" : "Play all"}
          icon={queueRunning ? "stop" : "play"}
          variant={queueRunning ? "secondary" : "primary"}
          onPress={() => void (queueRunning ? stopAudio() : playAll(items, "lesson"))}
          style={styles.playAll}
        />
      </View>

      <GermanVoiceNotice />

      {recordings.length > 0 ? (
        <View style={{ gap: SPACING.sm }}>
          <Txt variant="overline">Recordings</Txt>
          {recordings.map((r) => (
            <RecordingRow key={r.id} id={r.id} title={r.title} url={r.url} />
          ))}
        </View>
      ) : null}

      {visible.length > 0 ? (
        <View style={styles.phrases}>
          {visible.map((p) => (
            <PhraseRow key={p} text={p} />
          ))}
        </View>
      ) : null}

      {phrases.length > PREVIEW ? (
        <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" style={styles.more} hitSlop={6}>
          <Text style={styles.moreText}>{open ? "Show less" : `Show all ${phrases.length}`}</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={COLORS.primary} />
        </Pressable>
      ) : null}
    </Card>
  );
}

function PhraseRow({ text }: { text: string }) {
  const playing = useNowPlaying() === text;
  return (
    <View style={[styles.phraseRow, playing && styles.phraseRowPlaying]}>
      <SpeakButton text={text} size={36} />
      <Text style={styles.phraseText}>{text}</Text>
    </View>
  );
}

function RecordingRow({ id, title, url }: { id: string; title: string; url: string }) {
  const key = `rec:${id}`;
  const playing = useNowPlaying() === key;
  return (
    <Pressable
      onPress={() => void play({ text: title, url, key }).catch(() => undefined)}
      accessibilityRole="button"
      accessibilityLabel={playing ? `Stop ${title}` : `Play recording ${title}`}
      style={[styles.phraseRow, playing && styles.phraseRowPlaying]}
    >
      <View style={[styles.recIcon, playing && { backgroundColor: COLORS.primary }]}>
        <Ionicons name={playing ? "stop" : "mic"} size={16} color={playing ? "#FFFFFF" : COLORS.primary} />
      </View>
      <Text style={styles.phraseText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  speakLink: {
    color: COLORS.primary,
    fontFamily: FONTS.bodySemi,
  },
  speakLinkPlaying: {
    backgroundColor: COLORS.primarySoft,
  },
  speakIcon: {
    color: COLORS.primary,
  },
  webLink: {
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  panel: {
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
    flexWrap: "wrap",
  },
  playAll: {
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
  },
  phrases: {
    gap: 6,
  },
  phraseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: RADIUS.md,
  },
  phraseRowPlaying: {
    backgroundColor: COLORS.primaryTint,
  },
  phraseText: {
    flex: 1,
    fontFamily: FONTS.title,
    fontSize: 16,
    color: COLORS.ink,
  },
  recIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  more: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    minHeight: 32,
  },
  moreText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
    color: COLORS.primary,
  },
});
