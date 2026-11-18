import { apiClient } from "./client";
import { APP_LANGUAGE, APP_LEVEL, APP_SLUG } from "../config";

export type LearningApp = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primaryColor: string | null;
  language: { id: string; code: string; name: string; nativeName: string | null };
  level: { id: string; code: string; name: string } | null;
};

type AppPage = { data: LearningApp[] };

let cached: Promise<LearningApp> | null = null;

/**
 * The CMS app this build belongs to: the slug from EXPO_PUBLIC_APP_SLUG,
 * otherwise the first active app for German A1. Cached for the session;
 * a failed lookup is retried on the next call.
 */
export function getCurrentApp(): Promise<LearningApp> {
  if (!cached) {
    cached = (async () => {
      if (APP_SLUG) {
        const res = await apiClient.get<LearningApp>(`/apps/${encodeURIComponent(APP_SLUG)}`);
        return res.data;
      }
      const res = await apiClient.get<AppPage>("/apps", {
        params: { language: APP_LANGUAGE, level: APP_LEVEL, limit: 1 },
      });
      const app = res.data.data[0];
      if (!app) {
        throw new Error(`No active ${APP_LANGUAGE.toUpperCase()} ${APP_LEVEL} app is set up in the CMS yet.`);
      }
      return app;
    })().catch((error: unknown) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}
