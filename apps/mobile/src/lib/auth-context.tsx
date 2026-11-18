import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import * as SecureStore from "expo-secure-store";

import {
  changeLearnerPassword,
  getLearnerProfile,
  updateLearnerProfile,
  loginLearner,
  logoutLearner,
  refreshLearnerSession,
  type LearnerProfile,
} from "../api/learner-auth";

import { setApiAccessToken, setTokenRefresher } from "../api/client";

// v2: adds the refresh token (v1 sessions had none and simply expire).
const SESSION_KEY = "learning_learner_session_v2";
const LEGACY_SESSION_KEY = "learning_learner_session_v1";

type StoredSession = {
  accessToken: string;
  expiresAt: number;
  refreshToken: string | null;
  user: LearnerProfile;
};

type AuthContextValue = {
  user: LearnerProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Save a changed name. */
  updateDisplayName: (displayName: string) => Promise<void>;
  /** Change password; other devices are signed out, this one keeps going. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readSession(): Promise<StoredSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

async function writeSession(session: StoredSession | null): Promise<void> {
  if (session) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<StoredSession | null>(null);

  const clearSession = useCallback(async () => {
    sessionRef.current = null;
    setApiAccessToken(null);
    setUser(null);
    await writeSession(null).catch(() => undefined);
  }, []);

  /** Renews the access token; signs the learner out if that is no longer possible. */
  const refresh = useCallback(async (): Promise<string | null> => {
    const current = sessionRef.current;
    if (!current?.refreshToken) {
      await clearSession();
      return null;
    }
    try {
      const result = await refreshLearnerSession(current.refreshToken);
      const next: StoredSession = {
        ...current,
        accessToken: result.accessToken,
        expiresAt: Date.now() + result.expiresIn * 1000,
        // The API rotates refresh tokens: always keep the newest one.
        refreshToken: result.refreshToken ?? current.refreshToken,
      };
      sessionRef.current = next;
      setApiAccessToken(next.accessToken);
      await writeSession(next);
      return next.accessToken;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      // Only a rejected token ends the session; offline keeps it for later.
      if (status === 401 || status === 403) await clearSession();
      return null;
    }
  }, [clearSession]);

  useEffect(() => {
    setTokenRefresher(refresh);
    return () => setTokenRefresher(null);
  }, [refresh]);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        await SecureStore.deleteItemAsync(LEGACY_SESSION_KEY).catch(() => undefined);
        const session = await readSession();
        if (!session?.accessToken) return;

        sessionRef.current = session;
        setApiAccessToken(session.accessToken);
        // Show the saved profile straight away; refresh it in the background.
        if (active) setUser(session.user);

        if (session.expiresAt <= Date.now() + 30_000) {
          const token = await refresh();
          if (!token) return;
        }

        const profile = await getLearnerProfile();
        if (active && sessionRef.current) {
          setUser(profile);
          sessionRef.current = { ...sessionRef.current, user: profile };
          await writeSession(sessionRef.current);
        }
      } catch {
        // Network problems keep the saved session; a 401 was handled by refresh().
      } finally {
        if (active) setLoading(false);
      }
    }

    void restore();
    return () => {
      active = false;
    };
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await loginLearner(email, password);
    if (!result.accessToken || !result.user?.id || !result.expiresIn) {
      throw new Error("Invalid login response.");
    }

    const session: StoredSession = {
      accessToken: result.accessToken,
      expiresAt: Date.now() + result.expiresIn * 1000,
      refreshToken: result.refreshToken ?? null,
      user: result.user,
    };

    await writeSession(session);
    sessionRef.current = session;
    setApiAccessToken(session.accessToken);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = sessionRef.current?.refreshToken ?? null;
    // End the server session too; never block sign-out on the network.
    void logoutLearner(refreshToken).catch(() => undefined);
    await clearSession();
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const profile = await getLearnerProfile();
    setUser(profile);
    if (sessionRef.current) {
      sessionRef.current = { ...sessionRef.current, user: profile };
      await writeSession(sessionRef.current);
    }
  }, []);

  const updateDisplayName = useCallback(async (displayName: string) => {
    const profile = await updateLearnerProfile(displayName);
    const next = { ...(sessionRef.current?.user ?? profile), ...profile };
    setUser(next);
    if (sessionRef.current) {
      sessionRef.current = { ...sessionRef.current, user: next };
      await writeSession(sessionRef.current);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const result = await changeLearnerPassword(currentPassword, newPassword);
    const current = sessionRef.current;
    if (!current) return;
    // The API revoked every old session and returned a new one for this device.
    const next: StoredSession = {
      ...current,
      accessToken: result.accessToken,
      expiresAt: Date.now() + result.expiresIn * 1000,
      refreshToken: result.refreshToken ?? null,
    };
    sessionRef.current = next;
    setApiAccessToken(next.accessToken);
    await writeSession(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signOut, refreshProfile, updateDisplayName, changePassword }),
    [user, loading, signIn, signOut, refreshProfile, updateDisplayName, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useLearnerAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useLearnerAuth must be inside AuthProvider");
  return context;
}
