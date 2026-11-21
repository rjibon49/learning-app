/** Native names for the language picker before the CMS list has loaded. */
const NAMES: Record<string, string> = {
  en: "English",
  bn: "বাংলা",
  hi: "हिन्दी",
  ur: "اردو",
  ar: "العربية",
  tr: "Türkçe",
  fa: "فارسی",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  uk: "Українська",
  pl: "Polski",
  ro: "Română",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
  ne: "नेपाली",
  ta: "தமிழ்",
};

export function languageLabel(code: string, nativeName?: string | null): string {
  return nativeName || NAMES[code] || code.toUpperCase();
}
