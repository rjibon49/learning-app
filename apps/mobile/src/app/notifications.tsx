import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card, EmptyView, ErrorView, Screen, TopBar, Txt } from "../components/ui";
import { getCurrentApp } from "../api/app";
import { dismissInboxItem, fetchInbox, markInboxRead, type InboxItem } from "../api/inbox";
import { useAsync } from "../lib/use-async";
import { COLORS, SPACING } from "../styles/theme";
import { ListSkeleton } from "../components/Skeleton";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

const KIND_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  PROMOTION: "pricetag-outline",
  COURSE_UPDATE: "sparkles-outline",
  SUBSCRIPTION: "star-outline",
  MAINTENANCE: "construct-outline",
  SECURITY: "shield-checkmark-outline",
  GENERAL: "megaphone-outline",
};

/** App screens a CMS message may open (website paths are ignored). */
const APP_PATHS = /^\/(premium|words|learn|practice|progress|review|settings|lesson\/[\w-]+|quiz\/[\w-]+|word\/[\w-]+)?$/;

/** CMS action → where to go. Only our own screens and https links. */
function openAction(item: InboxItem) {
  const value = item.actionValue?.trim();
  if (!value) return;
  if (item.actionType === "EXTERNAL_URL" && /^https:\/\//i.test(value)) {
    void Linking.openURL(value);
  } else if (item.actionType === "INTERNAL_PATH" && APP_PATHS.test(value)) {
    router.push(value as Href);
  }
}

export default function NotificationsScreen() {
  const [appId, setAppId] = useState<string | null>(null);
  const state = useAsync(async () => {
    const app = await getCurrentApp();
    setAppId(app.id);
    return fetchInbox(app.id);
  }, []);

  async function open(item: InboxItem) {
    if (appId && !item.isRead) {
      void markInboxRead(appId, item.id).then(() => state.refresh()).catch(() => undefined);
    }
    openAction(item);
  }

  async function dismiss(item: InboxItem) {
    if (!appId) return;
    await dismissInboxItem(appId, item.id).catch(() => undefined);
    await state.refresh();
  }

  if (state.loading && !state.data) return <Screen scroll={false}><ListSkeleton label="Loading notifications" rows={5} title={false} /></Screen>;
  if (state.error && !state.data) {
    return <Screen scroll={false}><ErrorView message={state.error} onRetry={() => void state.reload()} /></Screen>;
  }
  if (!state.data) return null;

  const { items } = state.data;

  return (
    <Screen edges={["top", "bottom"]} onRefresh={() => void state.refresh()} refreshing={state.refreshing}>
      <TopBar title="Notifications" />

      {items.length === 0 ? (
        <EmptyView icon="notifications-outline" title="No messages" message="News, tips and offers for your course will show up here." />
      ) : (
        items.map((item) => (
          <Card
            key={item.id}
            onPress={() => void open(item)}
            accessibilityLabel={`${item.isRead ? "" : "Unread. "}${item.title}`}
            style={[styles.item, !item.isRead && styles.unread]}
          >
            <View style={styles.head}>
              <Ionicons name={KIND_ICON[item.kind] ?? "megaphone-outline"} size={20} color={COLORS.primary} />
              <Txt variant="label" style={{ flex: 1 }}>{item.title}</Txt>
              {!item.isRead ? <View style={styles.dot} accessibilityLabel="Unread" /> : null}
            </View>
            <Txt variant="body" style={{ fontSize: 15, lineHeight: 22 }}>{item.message}</Txt>
            <View style={styles.foot}>
              <Txt variant="caption">{timeAgo(item.createdAt)}</Txt>
              {item.isDismissible ? (
                <Pressable onPress={() => void dismiss(item)} accessibilityRole="button" accessibilityLabel={`Remove ${item.title}`} hitSlop={10}>
                  <Txt variant="caption" style={{ color: COLORS.primary }}>Remove</Txt>
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { gap: SPACING.sm },
  unread: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  head: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  foot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
