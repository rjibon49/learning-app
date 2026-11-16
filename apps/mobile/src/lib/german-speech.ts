
import * as Speech from "expo-speech";

const MAX_PHRASE_LENGTH = 500;
const SPEECH_URL = "https://tts.invalid/speak";

export const GERMAN_SPEECH_SETTINGS = {
  language: "de-DE",
  rate: 0.68,
  pitch: 1.0,
  volume: 1.0,
} as const;

let cachedVoice: string | null | undefined;

async function getGermanVoice(): Promise<string | null> {
  if (cachedVoice !== undefined) {
    return cachedVoice;
  }

  try {
    const voices = await Speech.getAvailableVoicesAsync();

    const germanVoices = voices.filter((voice) =>
      /^de([-_]|$)/i.test(voice.language)
    );

    const preferred =
      germanVoices.find(
        (voice) =>
          voice.language.replace("_", "-").toLowerCase() ===
            "de-de" &&
          voice.quality === Speech.VoiceQuality.Enhanced
      ) ??
      germanVoices.find(
        (voice) =>
          voice.quality === Speech.VoiceQuality.Enhanced
      ) ??
      germanVoices.find(
        (voice) =>
          voice.language.replace("_", "-").toLowerCase() ===
          "de-de"
      ) ??
      germanVoices[0];

    cachedVoice = preferred?.identifier ?? null;
    return cachedVoice;
  } catch {
    // Fall back to the device's default German voice.
    return null;
  }
}

export function makeSpeechLink(text: string): string {
  return (
    SPEECH_URL +
    "?text=" +
    encodeURIComponent(text.trim())
  );
}

export function parseSpeechLink(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (
      parsed.origin !== "https://tts.invalid" ||
      parsed.pathname !== "/speak"
    ) {
      return null;
    }

    const text = parsed.searchParams.get("text")?.trim();

    if (!text || text.length > MAX_PHRASE_LENGTH) {
      return null;
    }

    return text;
  } catch {
    return null;
  }
}

// Remove Markdown formatting before pronunciation.
export function cleanMarkdownForSpeech(
  markdown: string
): string {
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

export async function speakGerman(
  text: string
): Promise<void> {
  const phrase = cleanMarkdownForSpeech(text);

  if (!phrase) {
    throw new Error("No text available for speech.");
  }

  await Speech.stop();

  const voice = await getGermanVoice();

  Speech.speak(
    phrase.slice(
      0,
      Math.min(
        MAX_PHRASE_LENGTH,
        Speech.maxSpeechInputLength
      )
    ),
    {
      ...GERMAN_SPEECH_SETTINGS,
      ...(voice ? { voice } : {}),
    }
  );
}

export async function stopGermanSpeech(): Promise<void> {
  await Speech.stop();
}
