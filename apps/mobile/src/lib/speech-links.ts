/**
 * "Speak this" links inside lesson Markdown. They never leave the app:
 * the lesson screen catches them and plays the German text.
 */
const SPEECH_URL = "https://tts.invalid/speak";
export const MAX_PHRASE_LENGTH = 500;

export function makeSpeechLink(text: string): string {
  return SPEECH_URL + "?text=" + encodeURIComponent(text.trim());
}

export function parseSpeechLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== "https://tts.invalid" || parsed.pathname !== "/speak") return null;
    const text = parsed.searchParams.get("text")?.trim();
    if (!text || text.length > MAX_PHRASE_LENGTH) return null;
    return text;
  } catch {
    return null;
  }
}
