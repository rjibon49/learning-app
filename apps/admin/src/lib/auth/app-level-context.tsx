'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { LearningApp } from '@/types/app';
import { getApps } from '@/lib/api/apps';

interface AppLevelContextValue {
  apps: LearningApp[];
  selectedApp: LearningApp | null;
  isLoadingApps: boolean;
  appsError: string | null;
  selectAppById: (appId: string) => void;
  reloadApps: () => Promise<void>;
}

const AppLevelContext = createContext<AppLevelContextValue | undefined>(
  undefined
);

const LEVEL_SORT_ORDER: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
};

export function AppLevelProvider({ children }: { children: React.ReactNode }) {
  const [apps, setApps] = useState<LearningApp[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isLoadingApps, setIsLoadingApps] = useState<boolean>(true);
  const [appsError, setAppsError] = useState<string | null>(null);

  const loadApps = useCallback(async () => {
    setIsLoadingApps(true);
    setAppsError(null);
    try {
      const fetched = await getApps();
      const sorted = [...fetched].sort(
        (a, b) =>
          (LEVEL_SORT_ORDER[a.level] ?? 99) - (LEVEL_SORT_ORDER[b.level] ?? 99)
      );
      setApps(sorted);

      setSelectedAppId((currentId) => {
        if (currentId && sorted.some((app) => app.id === currentId)) {
          return currentId;
        }
        const defaultA1 =
          sorted.find((app) => app.level === 'A1') ?? sorted[0] ?? null;
        return defaultA1 ? defaultA1.id : null;
      });
    } catch (err) {
      setAppsError(
        err instanceof Error ? err.message : 'Failed to load German levels.'
      );
    } finally {
      setIsLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  const selectAppById = useCallback((appId: string) => {
    setSelectedAppId(appId);
  }, []);

  const selectedApp = useMemo(
    () => apps.find((app) => app.id === selectedAppId) ?? null,
    [apps, selectedAppId]
  );

  const value = useMemo<AppLevelContextValue>(
    () => ({
      apps,
      selectedApp,
      isLoadingApps,
      appsError,
      selectAppById,
      reloadApps: loadApps,
    }),
    [apps, selectedApp, isLoadingApps, appsError, selectAppById, loadApps]
  );

  return (
    <AppLevelContext.Provider value={value}>
      {children}
    </AppLevelContext.Provider>
  );
}

export function useAppLevel(): AppLevelContextValue {
  const context = useContext(AppLevelContext);
  if (!context) {
    throw new Error('useAppLevel must be used inside an AppLevelProvider');
  }
  return context;
}