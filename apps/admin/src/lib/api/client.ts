
import type { RefreshResponseDto } from '@/types/auth';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api'
).replace(/\/+$/, '');

// Keep admin authentication same-origin so the HttpOnly refresh cookie survives
// reloads, even when the CMS and API use different hosts or subdomains.
const AUTH_API_BASE_URL = '/api';

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function onSessionExpired(handler: () => void): void {
  unauthorizedHandler = handler;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: string[];

  constructor(status: number, message: string, code = 'API_ERROR', details?: string[]) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function mapStatusToSafeMessage(status: number, serverMessage?: string): string {
  switch (status) {
    case 400:
      return serverMessage || 'Invalid request data. Please review the form fields and try again.';
    case 401:
      return 'Your session has expired or credentials are invalid. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return serverMessage || 'The requested resource could not be found.';
    case 409:
      return serverMessage || 'A record with these details already exists.';
    case 429:
      return 'Too many requests. Please wait a moment before trying again.';
    default:
      return 'An unexpected server error occurred. Please try again later.';
  }
}

async function parseErrorPayload(response: Response): Promise<ApiClientError> {
  let serverMessage: string | undefined;
  let details: string[] | undefined;

  try {
    const body = (await response.json()) as Record<string, unknown>;
    if (typeof body.message === 'string') {
      serverMessage = body.message;
    } else if (Array.isArray(body.message)) {
      details = body.message.filter((item): item is string => typeof item === 'string');
      serverMessage = details[0];
    }
  } catch {
    // Ignore non-JSON error bodies
  }

  const safeServerMsg = response.status < 500 ? serverMessage : undefined;
  const safeMessage = mapStatusToSafeMessage(response.status, safeServerMsg);

  return new ApiClientError(response.status, safeMessage, `HTTP_${response.status}`, details);
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/admin/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        setAccessToken(null);
        return null;
      }

      const data = (await response.json()) as RefreshResponseDto;
      if (data && typeof data.accessToken === 'string') {
        setAccessToken(data.accessToken);
        return data.accessToken;
      }
      setAccessToken(null);
      return null;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  skipAuthRefresh?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = normalizedPath.startsWith('/admin/auth/')
    ? AUTH_API_BASE_URL
    : API_BASE_URL;
  const url = `${baseUrl}${normalizedPath}`;
  const { headers = {}, skipAuthRefresh = false, ...restOptions } = options;

  const buildHeaders = (token: string | null): Record<string, string> => {
    const reqHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...headers,
    };

    if (restOptions.body && !(restOptions.body instanceof FormData)) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    return reqHeaders;
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      credentials: 'include',
      headers: buildHeaders(inMemoryAccessToken),
    });
  } catch {
    throw new ApiClientError(
      0,
      'Unable to reach the backend API. Ensure the NestJS server is running.',
      'NETWORK_ERROR'
    );
  }

  const isAuthEndpoint =
    normalizedPath.startsWith('/admin/auth/login') ||
    normalizedPath.startsWith('/admin/auth/refresh') ||
    normalizedPath.startsWith('/admin/auth/logout');

  if (response.status === 401 && !skipAuthRefresh && !isAuthEndpoint) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      const retryResponse = await fetch(url, {
        ...restOptions,
        credentials: 'include',
        headers: buildHeaders(newToken),
      });

      if (!retryResponse.ok) {
        if (retryResponse.status === 401 && unauthorizedHandler) {
          unauthorizedHandler();
        }
        throw await parseErrorPayload(retryResponse);
      }

      if (retryResponse.status === 204) {
        return undefined as T;
      }
      return (await retryResponse.json()) as T;
    } else {
      if (unauthorizedHandler && !isAuthEndpoint) {
        unauthorizedHandler();
      }
      throw await parseErrorPayload(response);
    }
  }

  if (!response.ok) {
    throw await parseErrorPayload(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
