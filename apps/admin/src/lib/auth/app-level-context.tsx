
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { LearningApp } from "@/types/app";
import { getApps } from "@/lib/api/apps";

interface AppLevelContextValue {
  apps: LearningApp[];
  selectedApp: LearningApp | null;
  isLoadingApps: boolean;
  appsError: string | null;
  selectAppById: (id: string) => void;
  reloadApps: () => Promise<void>;
}

const STORAGE_KEY = "learning-cms-selected-app";

const AppLevelContext = createContext<
  AppLevelContextValue | undefined
>(undefined);

function sortApps(apps: LearningApp[]): LearningApp[] {
  return [...apps].sort((a, b) => {
    const languageOrder = a.language.name.localeCompare(
      b.language.name,
    );

    if (languageOrder !== 0) return languageOrder;

    const order = [
      "A1", "A2", "B1", "B2", "C1", "C2",
      "N5", "N4", "N3", "N2", "N1",
      "1", "2", "3", "4", "5", "6",
    ];

    const aIndex = order.indexOf(a.level);
    const bIndex = order.indexOf(b.level);

    return (
      (aIndex < 0 ? 100 : aIndex) -
      (bIndex < 0 ? 100 : bIndex)
    );
  });
}

export function AppLevelProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [apps, setApps] = useState<LearningApp[]>([]);
  const [selectedAppId, setSelectedAppId] =
    useState<string | null>(() => {
      if (typeof window === "undefined") return null;

      try {
        return window.localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    });

  const [isLoadingApps, setIsLoadingApps] =
    useState(true);

  const [appsError, setAppsError] =
    useState<string | null>(null);

  const reloadApps = useCallback(async () => {
    setIsLoadingApps(true);
    setAppsError(null);

    try {
      const response = await getApps();
      const sorted = sortApps(response);

      setApps(sorted);

      setSelectedAppId((previous) => {
        if (
          previous &&
          sorted.some(
            (app) => app.id === previous && app.isActive,
          )
        ) {
          return previous;
        }

        const defaultApp =
          sorted.find((app) => app.isActive) ?? null;

        return defaultApp?.id ?? null;
      });
    } catch (error) {
      setAppsError(
        error instanceof Error
          ? error.message
          : "Unable to load applications",
      );
    } finally {
      setIsLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    void reloadApps();
  }, [reloadApps]);

  useEffect(() => {
    try {
      if (selectedAppId) {
        window.localStorage.setItem(
          STORAGE_KEY,
          selectedAppId,
        );
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage access can be restricted by the browser.
    }
  }, [selectedAppId]);

  const selectedApp = useMemo(
    () =>
      apps.find((app) => app.id === selectedAppId) ??
      null,
    [apps, selectedAppId],
  );

  const selectAppById = useCallback(
    (id: string) => {
      const app = apps.find(
        (item) => item.id === id && item.isActive,
      );

      if (app) {
        setSelectedAppId(app.id);
      }
    },
    [apps],
  );

  const value = useMemo<AppLevelContextValue>(
    () => ({
      apps,
      selectedApp,
      isLoadingApps,
      appsError,
      selectAppById,
      reloadApps,
    }),
    [
      apps,
      selectedApp,
      isLoadingApps,
      appsError,
      selectAppById,
      reloadApps,
    ],
  );

  return (
    <AppLevelContext.Provider value={value}>
      {children}
    </AppLevelContext.Provider>
  );
}

export function useAppLevel() {
  const context = useContext(AppLevelContext);

  if (!context) {
    throw new Error(
      "useAppLevel must be used inside AppLevelProvider",
    );
  }

  return context;
}
