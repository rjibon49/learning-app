import { useEffect } from 'react';

/**
 * Runs `run` after render whenever its identity changes (i.e. when the
 * useCallback dependencies of a loader change).
 *
 * Why not `useEffect(() => { void load(); }, [load])`?
 * Loaders call setLoading(true) synchronously, which inside an effect body
 * causes a cascading re-render (react-hooks/set-state-in-effect). Deferring
 * one microtask keeps the behaviour and also skips a run whose inputs already
 * changed again (fast typing, React Strict Mode double effects).
 */
export function useRunOnChange(run: () => unknown): void {
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void run();
    });
    return () => {
      cancelled = true;
    };
  }, [run]);
}
