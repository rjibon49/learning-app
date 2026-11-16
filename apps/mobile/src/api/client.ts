
import axios from "axios";

export const API_BASE_URL =
  "https://learning-api.mochiflix.com/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

let accessToken: string | null = null;

export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.set(
      "Authorization",
      `Bearer ${accessToken}`
    );
  }

  return config;
});

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;

    if (status === 429) {
      return "Too many requests. Please try again later.";
    }

    if (!error.response) {
      return "Cannot connect to the server. Check your internet connection.";
    }

    if (Array.isArray(data?.message)) {
      return data.message.join(". ");
    }

    if (typeof data?.message === "string") {
      return data.message;
    }

    return `Request failed (${status}).`;
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
