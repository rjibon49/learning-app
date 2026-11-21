import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

import { fetchAdUnits } from "../api/ads";

/**
 * Google AdMob for the A1 app (free, with ads; no subscription).
 *
 * - Which ads run is decided in the CMS (Ads page): ads on for the app and an
 *   enabled AdMob configuration with the unit ids. Learners who are ad-free
 *   (e.g. a streak reward) get no ads.
 * - Development builds always use Google's test ads, so the real account is
 *   never clicked by us.
 * - Expo Go has no AdMob native module: there everything here does nothing.
 * - Consent (GDPR/UMP) is gathered before the SDK starts.
 */

/** Our AdMob units (Android). Used when the CMS configuration leaves a field empty. */
const DEFAULT_UNITS = {
  android: {
    banner: "ca-app-pub-4314661502921339/5078177568",
    interstitial: "ca-app-pub-4314661502921339/1197361043",
    rewarded: "ca-app-pub-4314661502921339/1539929794",
  },
} as const;

type AdKind = "banner" | "interstitial" | "rewarded";
type Lib = typeof import("react-native-google-mobile-ads");

let lib: Lib | null | undefined;

/** The AdMob library, or null where it can't run (web, Expo Go). */
export function adsLib(): Lib | null {
  if (lib !== undefined) return lib;
  if (Platform.OS === "web" || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    lib = null;
    return lib;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so Expo Go keeps working
    lib = require("react-native-google-mobile-ads") as Lib;
  } catch {
    lib = null;
  }
  return lib;
}

/* ------------------------------------------------------------------ */
/* State shared with React                                             */
/* ------------------------------------------------------------------ */

type AdsState = {
  /** SDK started, consent allows requests and this learner should see ads. */
  ready: boolean;
  units: Partial<Record<AdKind, string>>;
  /** The consent form offers "Privacy options" (EU and similar regions). */
  privacyOptionsRequired: boolean;
};

let state: AdsState = { ready: false, units: {}, privacyOptionsRequired: false };
const listeners = new Set<() => void>();

function setState(next: Partial<AdsState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function useAdsState(): AdsState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/* ------------------------------------------------------------------ */
/* Start-up                                                            */
/* ------------------------------------------------------------------ */

let starting: Promise<void> | null = null;
let startedFor: string | null = null;

/** Start ads for this learner and app. Safe to call often; runs once per app id. */
export function initAds(appId: string): Promise<void> {
  if (starting && startedFor === appId) return starting;
  startedFor = appId;
  starting = start(appId).catch(() => {
    setState({ ready: false });
  });
  return starting;
}

async function start(appId: string) {
  const ads = adsLib();
  if (!ads) return;

  const platform = Platform.OS === "android" ? "android" : null;
  let units: Partial<Record<AdKind, string>> = {};

  if (__DEV__) {
    units = { banner: ads.TestIds.BANNER, interstitial: ads.TestIds.INTERSTITIAL, rewarded: ads.TestIds.REWARDED };
  } else {
    const config = await fetchAdUnits(appId);
    const admob = config.configurations.find((c) => c.provider.toUpperCase() === "ADMOB") ?? config.configurations[0];
    if (!config.adsEnabled || !admob || !platform) return;
    const defaults = DEFAULT_UNITS[platform];
    units = {
      banner: admob.bannerAdUnitId || defaults.banner,
      interstitial: admob.interstitialAdUnitId || defaults.interstitial,
      rewarded: admob.rewardedAdUnitId || defaults.rewarded,
    };
  }

  // Consent first (shows Google's form where the law asks for it).
  const consent = await ads.AdsConsent.gatherConsent().catch(() => null);
  const privacyOptionsRequired =
    consent?.privacyOptionsRequirementStatus === ads.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  if (consent && !consent.canRequestAds) {
    setState({ privacyOptionsRequired });
    return;
  }

  await ads.default().setRequestConfiguration({
    maxAdContentRating: ads.MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });
  await ads.default().initialize();

  setState({ ready: true, units, privacyOptionsRequired });
  preloadInterstitial();
}

/** Settings → "Ad privacy choices" (only offered where required). */
export async function showAdPrivacyOptions() {
  const ads = adsLib();
  if (!ads) return;
  await ads.AdsConsent.showPrivacyOptionsForm();
}

/* ------------------------------------------------------------------ */
/* Interstitial after finishing a lesson or quiz                        */
/* ------------------------------------------------------------------ */

const MIN_GAP_MS = 3 * 60 * 1000; // at most one every 3 minutes
const EVERY_NTH = 2; // and only after every 2nd finished lesson/quiz

let interstitial: ReturnType<Lib["InterstitialAd"]["createForAdRequest"]> | null = null;
let lastShown = 0;
let finishedCount = 0;

function preloadInterstitial() {
  const ads = adsLib();
  const unit = state.units.interstitial;
  if (!ads || !state.ready || !unit || interstitial) return;

  const ad = ads.InterstitialAd.createForAdRequest(unit);
  ad.addAdEventListener(ads.AdEventType.CLOSED, () => {
    interstitial = null;
    preloadInterstitial();
  });
  ad.addAdEventListener(ads.AdEventType.ERROR, () => {
    interstitial = null;
    // Try again a bit later; no-fill is normal.
    setTimeout(preloadInterstitial, 60_000);
  });
  interstitial = ad;
  ad.load();
}

/**
 * Call at a natural break (lesson finished, quiz done). Shows an interstitial
 * now and then — never more than once every few minutes.
 */
export function maybeShowInterstitial() {
  if (!state.ready) return;
  finishedCount += 1;
  if (finishedCount % EVERY_NTH !== 0) return;
  if (Date.now() - lastShown < MIN_GAP_MS) return;
  if (!interstitial?.loaded) {
    preloadInterstitial();
    return;
  }
  lastShown = Date.now();
  interstitial.show().catch(() => {
    interstitial = null;
    preloadInterstitial();
  });
}
