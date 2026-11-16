
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import * as SecureStore from "expo-secure-store";

import {
  getLearnerProfile,
  loginLearner,
  type LearnerProfile,
} from "../api/learner-auth";

import {
  setApiAccessToken,
} from "../api/client";

const SESSION_KEY = "learning_learner_session_v1";

type StoredSession = {
  accessToken: string;
  expiresAt: number;
  user: LearnerProfile;
};

type AuthContextValue = {
  user: LearnerProfile | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

async function removeSession() {
  setApiAccessToken(null);
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<LearnerProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const raw = await SecureStore.getItemAsync(
          SESSION_KEY
        );

        if (!raw) return;

        const session = JSON.parse(raw) as StoredSession;

        if (
          !session.accessToken ||
          !Number.isFinite(session.expiresAt) ||
          session.expiresAt <= Date.now() + 5000
        ) {
          await removeSession();
          return;
        }

        setApiAccessToken(session.accessToken);

        const profile = await getLearnerProfile();

        if (active) {
          setUser(profile);
        }
      } catch {
        await removeSession().catch(() => undefined);
      } finally {
        if (active) setLoading(false);
      }
    }

    void restore();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await loginLearner(email, password);

      if (
        !result.accessToken ||
        !result.user?.id ||
        !result.expiresIn
      ) {
        throw new Error("Invalid login response.");
      }

      const session: StoredSession = {
        accessToken: result.accessToken,
        expiresAt:
          Date.now() + result.expiresIn * 1000,
        user: result.user,
      };

      await SecureStore.setItemAsync(
        SESSION_KEY,
        JSON.stringify(session)
      );

      setApiAccessToken(result.accessToken);
      setUser(result.user);
    },
    []
  );

  const signOut = useCallback(async () => {
    setUser(null);
    await removeSession();
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await getLearnerProfile();
    setUser(profile);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, loading, signIn, signOut, refreshProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useLearnerAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useLearnerAuth must be inside AuthProvider"
    );
  }

  return context;
}
