import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ArticleChip, Button, ProgressBar, Screen, Txt } from "../components/ui";
import { useLearnerAuth } from "../lib/auth-context";
import { GOALS, savePrefs, type DailyGoal, type Prefs } from "../lib/preferences";
import { useContentLanguage } from "../lib/content-language";
import { languageLabel } from "../lib/language-names";
import { COLORS, RADIUS, SPACING } from "../styles/theme";

const STEPS = 3;

function Option({
  title,
  detail,
  icon,
  selected,
  onPress,
}: {
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${detail}`}
      style={({ pressed }) => [styles.option, selected && styles.optionActive, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={26} color={selected ? COLORS.primary : COLORS.muted} />
      <View style={{ flex: 1 }}>
        <Txt variant="label">{title}</Txt>
        <Txt variant="caption">{detail}</Txt>
      </View>
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={22}
        color={selected ? COLORS.primary : COLORS.faint}
      />
    </Pressable>
  );
}

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: "book-outline", title: "Short lessons", text: "Step by step through A1, in the right order." },
  { icon: "volume-high-outline", title: "Hear every word", text: "Tap any German word to hear it, slowly if you like." },
  { icon: "refresh-outline", title: "Review that sticks", text: "Words come back just before you would forget them." },
];

export default function OnboardingScreen() {
  const { user } = useLearnerAuth();
  const [step, setStep] = useState(0);
  const [start, setStart] = useState<Prefs["startingPoint"]>("beginner");
  const [goal, setGoal] = useState<DailyGoal>(2);
  const [saving, setSaving] = useState(false);
  const firstName = (user?.displayName ?? "").split(" ")[0];
  const language = useContentLanguage();

  async function finish() {
    if (!user) return;
    setSaving(true);
    await savePrefs(user.id, { onboarded: true, startingPoint: start, dailyGoal: goal });
    router.replace("/");
  }

  return (
    <Screen
      edges={["top", "bottom"]}
      background={COLORS.surface}
      footer={
        <View style={styles.footer}>
          {step > 0 ? (
            <Button title="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} style={{ flex: 1 }} />
          ) : null}
          <Button
            title={step === STEPS - 1 ? "Start learning" : "Continue"}
            icon={step === STEPS - 1 ? "rocket-outline" : "arrow-forward"}
            loading={saving}
            onPress={() => (step === STEPS - 1 ? void finish() : setStep((s) => s + 1))}
            style={{ flex: 2 }}
          />
        </View>
      }
    >
      <ProgressBar value={((step + 1) / STEPS) * 100} label={`Step ${step + 1} of ${STEPS}`} />

      {step === 0 ? (
        <View style={{ gap: SPACING.xl }}>
          <View style={{ gap: SPACING.sm }}>
            <Txt variant="h1">Willkommen{firstName ? `, ${firstName}` : ""}!</Txt>
            <Txt variant="bodyLarge" style={{ color: COLORS.muted }}>
              Your German A1 course: from your first “Hallo” to simple everyday conversations.
            </Txt>
          </View>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="label">{f.title}</Txt>
                <Txt variant="caption" style={{ fontSize: 14 }}>{f.text}</Txt>
              </View>
            </View>
          ))}
          <Pressable
            onPress={() => router.push("/settings/language")}
            accessibilityRole="button"
            accessibilityLabel={`Explanation language: ${languageLabel(language)}. Change`}
            style={({ pressed }) => [styles.option, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="language-outline" size={26} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Txt variant="label">Explanations in {languageLabel(language)}</Txt>
              <Txt variant="caption">Tap to choose another language</Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.faint} />
          </Pressable>
          <View style={styles.articles}>
            <Txt variant="caption" style={{ flex: 1 }}>Nouns are colour-coded by article:</Txt>
            <ArticleChip article="der" />
            <ArticleChip article="die" />
            <ArticleChip article="das" />
          </View>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: SPACING.md }}>
          <Txt variant="h2">How much German do you know?</Txt>
          <Option
            icon="leaf-outline"
            title="I'm new to German"
            detail="Start with the first lesson."
            selected={start === "beginner"}
            onPress={() => setStart("beginner")}
          />
          <Option
            icon="chatbubbles-outline"
            title="I know some German"
            detail="Skim the first lessons quickly and use Words and quizzes to fill gaps."
            selected={start === "some"}
            onPress={() => setStart("some")}
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: SPACING.md }}>
          <Txt variant="h2">Pick a daily goal</Txt>
          <Txt variant="caption" style={{ fontSize: 14 }}>
            A step is one lesson, one review or one quiz. You can change this in Settings.
          </Txt>
          {GOALS.map((g) => (
            <Option
              key={g.value}
              icon={g.value >= 3 ? "flame-outline" : "time-outline"}
              title={g.title}
              detail={g.detail}
              selected={goal === g.value}
              onPress={() => setGoal(g.value)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  feature: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  articles: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexWrap: "wrap" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
});
