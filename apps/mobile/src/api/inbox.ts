import { Platform } from "react-native";

import { apiClient } from "./client";

export type InboxItem = {
  id: string;
  title: string;
  message: string;
  kind: string;
  purpose: string;
  createdAt: string;
  actionType: string | null;
  actionValue: string | null;
  isRead: boolean;
  isDismissible: boolean;
};

function params(appId: string) {
  return {
    appId,
    platform: Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB",
    locale: "en",
  };
}

/** Messages from the CMS (Announcements shown in the notification bell). */
export async function fetchInbox(appId: string): Promise<{ items: InboxItem[]; unread: number }> {
  const res = await apiClient.get<{ data: InboxItem[]; unreadCount: number }>("/auth/learner/notifications", {
    params: { ...params(appId), limit: 50 },
  });
  return { items: res.data.data, unread: res.data.unreadCount };
}

export async function fetchUnreadCount(appId: string): Promise<number> {
  const res = await apiClient.get<{ unreadCount: number }>("/auth/learner/notifications/unread-count", {
    params: params(appId),
  });
  return res.data.unreadCount;
}

export async function markInboxRead(appId: string, id: string): Promise<void> {
  await apiClient.post(`/auth/learner/notifications/${encodeURIComponent(id)}/read`, null, {
    params: params(appId),
  });
}

export async function dismissInboxItem(appId: string, id: string): Promise<void> {
  await apiClient.post(`/auth/learner/notifications/${encodeURIComponent(id)}/dismiss`, null, {
    params: params(appId),
  });
}
