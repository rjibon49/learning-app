import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Google Analytics for Firebase.
 *
 * - Runs only in a native build that was made with google-services.json
 *   (see app.config.js). In Expo Go, on web, or in a build without the
 *   Firebase config, every function here does nothing.
 * - Development builds send nothing unless EXPO_PUBLIC_ANALYTICS_DEBUG=1, so
 *   our own testing does not mix with real users' numbers.
 * - Never send names, emails or other personal data as event parameters.
 */

type Lib = typeof import("@react-native-firebase/analytics");
type Analytics = ReturnType<Lib["getAnalytics"]>;

let lib: Lib | null | undefined;
let instance: Analytics | null = null;

function analytics(): { lib: Lib; a: Analytics } | null {
  if (lib === undefined) {
    lib = null;
    if (Platform.OS !== "web" && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so Expo Go keeps working
        const loaded = require("@react-native-firebase/analytics") as Lib;
        instance = loaded.getAnalytics();
        lib = loaded;
        const enabled = !__DEV__ || process.env.EXPO_PUBLIC_ANALYTICS_DEBUG === "1";
        void loaded.setAnalyticsCollectionEnabled(instance, enabled).catch(() => undefined);
      } catch {
        // No Firebase config in this build.
        lib = null;
        instance = null;
      }
    }
  }
  return lib && instance ? { lib, a: instance } : null;
}

/** Never let analytics break the app. */
function run(fn: (x: { lib: Lib; a: Analytics }) => unknown) {
  const x = analytics();
  if (!x) return;
  try {
    void Promise.resolve(fn(x)).catch(() => undefined);
  } catch {
    // ignore
  }
}

export function trackScreen(pathname: string) {
  run(({ lib, a }) => lib.logScreenView(a, { screen_name: pathname, screen_class: pathname }));
}

/** Our learner id (a database id, not an email), or null after sign-out. */
export function setAnalyticsUser(userId: string | null) {
  run(({ lib, a }) => lib.setUserId(a, userId));
}

export function trackLogin() {
  run(({ lib, a }) => lib.logLogin(a, { method: "email" }));
}

export function trackSignUp() {
  run(({ lib, a }) => lib.logSignUp(a, { method: "email" }));
}

export function trackLessonComplete(lessonId: string) {
  run(({ lib, a }) => lib.logEvent(a, "lesson_complete", { lesson_id: lessonId }));
}

export function trackQuizComplete(quizId: string, percentage: number, passed: boolean) {
  run(({ lib, a }) =>
    lib.logEvent(a, "quiz_complete", { quiz_id: quizId, score: Math.round(percentage), passed: passed ? 1 : 0 }),
  );
}
