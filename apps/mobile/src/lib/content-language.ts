import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiClient } from "../api/client";
import { APP_LANGUAGE, MEANING_LANGUAGE } from "../config";

/**
 * The language lessons are explained in and word meanings are shown in
 * (English, বাংলা, Türkçe …). The learner picks it in Settings / onboarding;
 * the first time it follows the phone's language.
 *
 * Content that is not translated yet falls back to English, then to any
 * language the CMS has. Adding a language in the CMS (and translating the
 * content into it) makes it appear in the picker — no app update needed.
 */
const KEY = "content_language_v1";
export const FALLBACK_LANGUAGE = "en";

let current = MEANING_LANGUAGE;
const listeners = new Set<(code: string) => void>();

export function getContentLanguage(): string {
  return current;
}

/** Order to try translations in: chosen → English. */
export function languagePreference(): string[] {
  return current === FALLBACK_LANGUAGE ? [current] : [current, FALLBACK_LANGUAGE];
}

/** Best item for the learner's language, e.g. a lesson or meaning translation. */
export function pickByLanguage<T>(items: T[], codeOf: (item: T) => string | undefined): T | null {
  for (const code of languagePreference()) {
    const hit = items.find((i) => codeOf(i) === code);
    if (hit) return hit;
  }
  return items[0] ?? null;
}

function deviceLanguage(): string | null {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale ? locale.split("-")[0].toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Call once at start-up. */
export async function loadContentLanguage(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved) {
      current = saved;
    } else {
      const device = deviceLanguage();
      // German speakers do not need German explanations: keep English.
      if (device && device !== APP_LANGUAGE) current = device;
    }
  } catch {
    // keep default
  }
  listeners.forEach((l) => l(current));
  return current;
}

export async function setContentLanguage(code: string): Promise<void> {
  current = code;
  listeners.forEach((l) => l(code));
  await AsyncStorage.setItem(KEY, code).catch(() => undefined);
}

/** Re-renders the screen when the learner switches language. */
export function useContentLanguage(): string {
  const [code, setCode] = useState(current);
  useEffect(() => {
    listeners.add(setCode);
    return () => {
      listeners.delete(setCode);
    };
  }, []);
  return code;
}

export type ExplanationLanguage = { code: string; name: string; nativeName: string | null };

/** Languages set up in the CMS, except the one being learned. */
export async function fetchExplanationLanguages(): Promise<ExplanationLanguage[]> {
  const res = await apiClient.get<ExplanationLanguage[] | { data: ExplanationLanguage[] }>("/languages");
  const list = Array.isArray(res.data) ? res.data : res.data.data;
  return list
    .filter((l) => l.code !== APP_LANGUAGE)
    .sort((a, b) => Number(b.code === FALLBACK_LANGUAGE) - Number(a.code === FALLBACK_LANGUAGE) || a.name.localeCompare(b.name));
}
