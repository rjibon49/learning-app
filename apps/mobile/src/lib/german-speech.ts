import * as Speech from "expo-speech";

import { MAX_PHRASE_LENGTH } from "./speech-links";

export { makeSpeechLink, parseSpeechLink } from "./speech-links";

let cachedVoice: string | null | undefined;

function isGerman(language: string): boolean {
  return /^de([-_]|$)/i.test(language);
}

/** Best German voice on this device (enhanced de-DE first), or null. */
async function getGermanVoice(): Promise<string | null> {
  if (cachedVoice !== undefined) return cachedVoice;

  try {
    const voices = (await Speech.getAvailableVoicesAsync()).filter((v) => isGerman(v.language));
    const deDE = (v: Speech.Voice) => v.language.replace("_", "-").toLowerCase() === "de-de";
    const enhanced = (v: Speech.Voice) => v.quality === Speech.VoiceQuality.Enhanced;
    const preferred =
      voices.find((v) => deDE(v) && enhanced(v)) ??
      voices.find(enhanced) ??
      voices.find(deDE) ??
      voices[0];
    // Only cache a real answer: the voice list can be empty right after start-up.
    if (voices.length > 0) cachedVoice = preferred?.identifier ?? null;
    return preferred?.identifier ?? null;
  } catch {
    return null;
  }
}

/**
 * Whether the phone has a German text-to-speech voice. Some Android phones
 * report an empty list even though "de-DE" works, so "unknown" is not an error.
 */
export async function germanVoiceStatus(): Promise<"available" | "missing" | "unknown"> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (voices.length === 0) return "unknown";
    return voices.some((v) => isGerman(v.language)) ? "available" : "missing";
  } catch {
    return "unknown";
  }
}

// Remove Markdown formatting before pronunciation.
export function cleanMarkdownForSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, "")
    .replace(/[|]/g, ". ")
    .replace(/[*_~`#]/g, "")
    .replace(/\[[ xX]\]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\.{2,}/g, ".")
    .trim();
}

/**
 * Speaks German with the device voice. Resolves when speech ends or is
 * stopped. `rate`: 1 = device normal speed.
 */
export async function speakGerman(text: string, rate = 0.85): Promise<void> {
  const phrase = cleanMarkdownForSpeech(text);
  if (!phrase) throw new Error("No text available for speech.");

  await Speech.stop();
  const voice = await getGermanVoice();

  await new Promise<void>((resolve, reject) => {
    Speech.speak(phrase.slice(0, Math.min(MAX_PHRASE_LENGTH, Speech.maxSpeechInputLength)), {
      language: "de-DE",
      rate,
      pitch: 1.0,
      volume: 1.0,
      ...(voice ? { voice } : {}),
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: (error) => reject(error instanceof Error ? error : new Error("Speech failed")),
    });
  });
}

export async function stopGermanSpeech(): Promise<void> {
  await Speech.stop();
}
