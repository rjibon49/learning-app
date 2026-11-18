import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card, ErrorView, IconButton, LoadingView, Screen, Txt } from "../components/ui";
import { getCurrentApp } from "../api/app";
import { fetchEntitlement, fetchPlans, formatPrice, type Plan } from "../api/premium";
import { useAsync } from "../lib/use-async";
import { COLORS, FONTS, RADIUS, SPACING } from "../styles/theme";

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "ban-outline", text: "No ads while you learn" },
  { icon: "heart-outline", text: "Support new lessons, audio and quizzes" },
  { icon: "phone-portrait-outline", text: "One account on phone and website" },
];

function monthlyEquivalent(plan: Plan): string | null {
  if (plan.planType !== "YEARLY") return null;
  return formatPrice({ ...plan, amountMinor: Math.round(plan.amountMinor / 12) });
}

export default function PremiumScreen() {
  const [selected, setSelected] = useState<Plan["planType"]>("YEARLY");
  const state = useAsync(async () => {
    const app = await getCurrentApp();
    const [entitlement, plans] = await Promise.all([fetchEntitlement(app.id), fetchPlans()]);
    return { entitlement, plans };
  }, []);

  if (state.loading && !state.data) return <Screen scroll={false}><LoadingView /></Screen>;
  if (state.error && !state.data) {
    return <Screen scroll={false}><ErrorView message={state.error} onRetry={() => void state.reload()} /></Screen>;
  }
  if (!state.data) return null;

  const { entitlement, plans } = state.data;
  const until = entitlement.adFreeUntil ? new Date(entitlement.adFreeUntil).toLocaleDateString() : null;

  return (
    <Screen edges={["top", "bottom"]} background={COLORS.surface}>
      <View style={styles.close}>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
      </View>

      <View style={styles.hero}>
        <View style={styles.star}>
          <Ionicons name="star" size={36} color={COLORS.goldIcon} />
        </View>
        <Txt variant="h1" style={{ textAlign: "center" }}>Premium</Txt>
        <Txt variant="body" style={{ textAlign: "center", color: COLORS.muted }}>
          Learn German without interruptions.
        </Txt>
      </View>

      {entitlement.adFree ? (
        <Card style={{ backgroundColor: COLORS.correctSoft, gap: 4 }}>
          <Txt variant="label" style={{ color: COLORS.correctText }}>
            {entitlement.subscriptionActive ? "You have Premium" : "You are ad-free"}
          </Txt>
          {until ? <Txt variant="caption" style={{ color: COLORS.correctText }}>Until {until}</Txt> : null}
        </Card>
      ) : null}

      <View style={{ gap: SPACING.md }}>
        {BENEFITS.map((b) => (
          <View key={b.text} style={styles.benefit}>
            <Ionicons name={b.icon} size={22} color={COLORS.primary} />
            <Txt variant="body">{b.text}</Txt>
          </View>
        ))}
      </View>

      {plans && plans.length > 0 ? (
        <View style={{ gap: SPACING.md }}>
          {plans.map((plan) => {
            const active = selected === plan.planType;
            const perMonth = monthlyEquivalent(plan);
            return (
              <Pressable
                key={plan.planType}
                onPress={() => setSelected(plan.planType)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${plan.planType === "YEARLY" ? "Yearly" : "Monthly"}, ${formatPrice(plan)}`}
                style={[styles.plan, active && styles.planActive]}
              >
                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color={active ? COLORS.primary : COLORS.faint}
                />
                <View style={{ flex: 1 }}>
                  <Txt variant="label">{plan.planType === "YEARLY" ? "Yearly" : "Monthly"}</Txt>
                  {perMonth ? <Txt variant="caption">{perMonth} per month</Txt> : null}
                </View>
                <Txt style={styles.price}>{formatPrice(plan)}</Txt>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {entitlement.subscriptionActive ? null : (
        <>
          <Button title="Coming soon" disabled onPress={() => undefined} />
          <Txt variant="caption" style={{ textAlign: "center" }}>
            In-app purchases open soon. Everything in the course stays free to learn until then.
          </Txt>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { alignItems: "flex-end", marginRight: -SPACING.md, marginTop: -SPACING.md },
  hero: { alignItems: "center", gap: SPACING.sm },
  star: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  benefit: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  planActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  price: { fontFamily: FONTS.title, fontSize: 18, color: COLORS.ink },
});
