import type { RefreshResponseDto } from '@/types/auth';

// Browser uses the same-origin Next.js rewrite; no public API URL is needed.
const DATA_BASE = '/api/backend';
const AUTH_BASE = '/api';

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let expiredHandler: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
export function getAccessToken(): string | null { return accessToken; }
export function onSessionExpired(handler: (() => void) | null): void {
  expiredHandler = handler;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'API_ERROR',
    public readonly details?: string[],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function errorText(status: number, message?: string): string {
  switch (status) {
    case 400: return message || 'Please check the submitted values.';
    case 401: return 'Please sign in again.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return message || 'Resource not found.';
    case 409: return message || 'This record conflicts with an existing record.';
    case 422: return message || 'Some fields are invalid.';
    case 429: return 'Too many requests. Please try later.';
    case 502: case 503: return 'The API is temporarily unavailable.';
    default: return status >= 500 ? 'Server error. Please try again.' : (message || 'Request failed.');
  }
}

async function responseError(res: Response): Promise<ApiClientError> {
  let message: string | undefined;
  let details: string[] | undefined;
  try {
    const payload: unknown = await res.json();
    if (payload && typeof payload === 'object') {
      const body = payload as { message?: unknown };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) {
        details = body.message.filter((x): x is string => typeof x === 'string');
        message = details[0];
      }
    }
  } catch { /* Non-JSON response */ }
  return new ApiClientError(res.status, errorText(res.status, message), `HTTP_${res.status}`, details);
}

async function decodeResponse<T>(res: Response): Promise<T> {
  if (!res.ok) throw await responseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try { return JSON.parse(text) as T; }
  catch { throw new ApiClientError(res.status, 'Invalid API response', 'INVALID_JSON'); }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${AUTH_BASE}/admin/auth/refresh`, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) { accessToken = null; return null; }
      const data = await res.json() as RefreshResponseDto;
      accessToken = typeof data.accessToken === 'string' ? data.accessToken : null;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally { refreshInFlight = null; }
  })();
  return refreshInFlight;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  skipAuthRefresh?: boolean;
}

export async function apiRequest<T>(endpoint: string, opts: ApiRequestOptions = {}): Promise<T> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const isAuth = path.startsWith('/admin/auth/');
  const url = `${isAuth ? AUTH_BASE : DATA_BASE}${path}`;
  const { headers = {}, skipAuthRefresh = false, ...init } = opts;
  const authOperation = /^\/admin\/auth\/(login|refresh|logout|logout-all)(\/|$)/.test(path);

  const buildHeaders = (token: string | null): Headers => {
    const result = new Headers(headers);
    if (!result.has('accept')) result.set('accept', 'application/json');
    if (init.body && !(init.body instanceof FormData) && !result.has('content-type')) {
      result.set('content-type', 'application/json');
    }
    if (token && !result.has('authorization')) result.set('authorization', `Bearer ${token}`);
    return result;
  };

  const send = async (token: string | null) => fetch(url, {
    ...init, credentials: 'same-origin', cache: 'no-store', headers: buildHeaders(token),
  });

  let response: Response;
  try { response = await send(accessToken); }
  catch { throw new ApiClientError(0, 'Unable to reach the API.', 'NETWORK_ERROR'); }

  if (response.status === 401 && !skipAuthRefresh && !authOperation) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      try { response = await send(refreshed); }
      catch { throw new ApiClientError(0, 'Unable to reach the API.', 'NETWORK_ERROR'); }
    } else {
      expiredHandler?.();
      throw await responseError(response);
    }
    if (response.status === 401) expiredHandler?.();
  }
  return decodeResponse<T>(response);
}
