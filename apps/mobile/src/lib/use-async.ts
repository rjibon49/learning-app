import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

import { getApiError } from "../api/client";

export type AsyncState<T> = {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  /** Pull-to-refresh: keeps the old data visible while reloading. */
  refreshing: boolean;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
};

/**
 * Loads data for a screen. `deps` work like useEffect deps.
 * Results from an outdated request are ignored.
 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const run = useCallback(async (mode: "load" | "refresh") => {
    const id = ++requestId.current;
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    try {
      const result = await loadRef.current();
      if (id !== requestId.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(getApiError(e));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    // Start after this render (no synchronous setState inside the effect);
    // a deps change before it starts cancels it.
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void run("load");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps
  }, deps);

  const reload = useCallback(() => run("load"), [run]);
  const refresh = useCallback(() => run("refresh"), [run]);

  return { data, error, loading, refreshing, reload, refresh };
}

/** Re-runs `refresh` whenever the screen comes back into focus (not on the first focus). */
export function useRefreshOnFocus(refresh: () => Promise<void>) {
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) void refresh();
      focusedOnce.current = true;
    }, [refresh]),
  );
}
