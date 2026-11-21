/**
 * Build-time settings. Override with EXPO_PUBLIC_* variables in
 * apps/mobile/.env (never put secrets here: EXPO_PUBLIC_ values are
 * bundled into the app).
 */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://learning-api.mochiflix.com/api"
).replace(/\/+$/, "");

/** Which CMS app this build shows. */
export const APP_LANGUAGE = process.env.EXPO_PUBLIC_APP_LANGUAGE ?? "de";
export const APP_LEVEL = process.env.EXPO_PUBLIC_APP_LEVEL ?? "A1";
/** Optional: pin one CMS app by slug instead of "first active de/A1 app". */
export const APP_SLUG = process.env.EXPO_PUBLIC_APP_SLUG ?? "";

/** Language the learner reads meanings in (falls back to any). */
export const MEANING_LANGUAGE = process.env.EXPO_PUBLIC_MEANING_LANGUAGE ?? "en";
