import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiClient } from "../api/client";

/**
 * Lessons this learner finished. The server list (GET
 * /learner/progress/lessons) is merged with the copy on this device, so a
 * new phone or a reinstall keeps the learning path, and a lesson finished
 * offline still counts.
 */
const key = (userId: string) => `lesson_progress_v1:${userId}`;

async function fetchServerCompleted(): Promise<string[]> {
  const res = await apiClient.get<{ data: { lessonId: string }[] }>("/learner/progress/lessons");
  return res.data.data.map((row) => row.lessonId);
}

export async function getCompletedLessons(userId: string): Promise<Set<string>> {
  const [local, server] = await Promise.all([
    readLocal(userId),
    // Older API without the route, or offline: use the device copy only.
    fetchServerCompleted().catch(() => [] as string[]),
  ]);
  const merged = new Set([...local, ...server]);
  if (merged.size > local.size) {
    await AsyncStorage.setItem(key(userId), JSON.stringify([...merged])).catch(() => undefined);
  }
  return merged;
}

async function readLocal(userId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export async function markLessonCompleted(userId: string, lessonId: string): Promise<void> {
  const done = await readLocal(userId);
  if (done.has(lessonId)) return;
  done.add(lessonId);
  try {
    await AsyncStorage.setItem(key(userId), JSON.stringify([...done]));
  } catch {
    // Storage full or unavailable: the server copy still has it.
  }
}
