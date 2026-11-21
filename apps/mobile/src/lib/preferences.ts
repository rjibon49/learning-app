import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Learner choices kept on this phone (per account): onboarding done,
 * daily goal, and today's finished steps toward that goal.
 *
 * A "step" is one finished lesson, one finished review session or one
 * submitted quiz.
 */
export type DailyGoal = 1 | 2 | 3 | 5;

export const GOALS: { value: DailyGoal; title: string; detail: string }[] = [
  { value: 1, title: "Casual", detail: "1 step a day · about 5 min" },
  { value: 2, title: "Regular", detail: "2 steps a day · about 10 min" },
  { value: 3, title: "Serious", detail: "3 steps a day · about 15 min" },
  { value: 5, title: "Intense", detail: "5 steps a day · 25 min or more" },
];

export type Prefs = {
  onboarded: boolean;
  dailyGoal: DailyGoal;
  /** "Total beginner" or "I know some German" (from onboarding). */
  startingPoint: "beginner" | "some";
};

const DEFAULTS: Prefs = { onboarded: false, dailyGoal: 2, startingPoint: "beginner" };

const prefsKey = (userId: string) => `prefs_v1:${userId}`;
const stepsKey = (userId: string) => `steps_v1:${userId}`;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getPrefs(userId: string): Promise<Prefs> {
  try {
    const raw = await AsyncStorage.getItem(prefsKey(userId));
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export async function savePrefs(userId: string, patch: Partial<Prefs>): Promise<Prefs> {
  const next = { ...(await getPrefs(userId)), ...patch };
  await AsyncStorage.setItem(prefsKey(userId), JSON.stringify(next)).catch(() => undefined);
  notify();
  return next;
}

export async function getTodaySteps(userId: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(stepsKey(userId));
    const data = raw ? (JSON.parse(raw) as { day: string; count: number }) : null;
    return data?.day === todayKey() ? data.count : 0;
  } catch {
    return 0;
  }
}

/** Call after a finished lesson, review session or quiz. */
export async function recordStep(userId: string | undefined): Promise<void> {
  if (!userId) return;
  const count = (await getTodaySteps(userId)) + 1;
  await AsyncStorage.setItem(stepsKey(userId), JSON.stringify({ day: todayKey(), count })).catch(() => undefined);
  notify();
}

/* Tiny change signal so open screens re-read prefs. */
const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}

/** Prefs + today's steps for the signed-in learner; updates live. */
export function usePrefs(userId: string | undefined) {
  const [state, setState] = useState<{ prefs: Prefs; steps: number; ready: boolean }>({
    prefs: DEFAULTS,
    steps: 0,
    ready: false,
  });

  const load = useCallback(async () => {
    if (!userId) return;
    const [prefs, steps] = await Promise.all([getPrefs(userId), getTodaySteps(userId)]);
    setState({ prefs, steps, ready: true });
  }, [userId]);

  useEffect(() => {
    // State is set after the storage read resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [load]);

  return state;
}
