import { create, isAxiosError, type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_BASE_URL } from "../config";

export { API_BASE_URL };

export const apiClient = create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    // The API returns the refresh token in the JSON body (no cookies) for mobile.
    "X-Client-Type": "mobile",
  },
});

let accessToken: string | null = null;

export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

/**
 * Set by AuthProvider: renews the access token with the stored refresh
 * token. Returns the new access token, or null when the session is over.
 */
type Refresher = () => Promise<string | null>;
let refresher: Refresher | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setTokenRefresher(fn: Refresher | null) {
  refresher = fn;
}

export function refreshAccessTokenOnce(): Promise<string | null> {
  if (!refresher) return Promise.resolve(null);
  if (!refreshInFlight) {
    refreshInFlight = refresher().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken && !config.headers.has("Authorization")) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

const AUTH_PATHS = /\/auth\/(learner\/(login|refresh|logout|forgot-password|reset-password)|register|verify-email|resend-verification)/;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !config ||
      config._retried ||
      AUTH_PATHS.test(config.url ?? "")
    ) {
      throw error;
    }

    config._retried = true;
    const token = await refreshAccessTokenOnce();
    if (!token) throw error;

    config.headers.set("Authorization", `Bearer ${token}`);
    return apiClient(config);
  },
);

export function getApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | {
          message?: string | string[];
          fieldErrors?: Record<string, string[]>;
          formErrors?: string[];
        }
      | undefined;

    if (status === 429) {
      return "Too many requests. Please wait a moment and try again.";
    }

    if (!error.response) {
      return "Cannot reach the server. Check your internet connection.";
    }

    // Server faults: "Internal server error" means nothing to a learner.
    if (status && status >= 500) {
      return "Our server had a problem saving this. Please try again in a moment.";
    }

    if (Array.isArray(data?.message)) return data.message.join(". ");
    if (typeof data?.message === "string") return data.message;

    // API validation errors (Zod flattenError).
    const firstField = data?.fieldErrors
      ? Object.values(data.fieldErrors).flat()[0]
      : undefined;
    if (firstField) return firstField;
    if (data?.formErrors?.[0]) return data.formErrors[0];

    return `Request failed (${status}).`;
  }

  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
