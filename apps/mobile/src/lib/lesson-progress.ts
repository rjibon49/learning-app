import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Lessons this learner finished on this device. The API stores progress
 * (POST /learner/progress/lessons) but has no "list my completed lessons"
 * route yet, so the path screen reads this local copy.
 */
const key = (userId: string) => `lesson_progress_v1:${userId}`;

export async function getCompletedLessons(userId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export async function markLessonCompleted(userId: string, lessonId: string): Promise<void> {
  const done = await getCompletedLessons(userId);
  if (done.has(lessonId)) return;
  done.add(lessonId);
  try {
    await AsyncStorage.setItem(key(userId), JSON.stringify([...done]));
  } catch {
    // Storage full or unavailable: the server copy still has it.
  }
}
