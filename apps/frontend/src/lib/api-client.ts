// Typed fetch wrapper for the backend REST API. This is the ONLY place in
// the frontend allowed to call `fetch` against the backend (T7.9) — every
// module's `api/` folder calls through here instead.
import type { ApiErrorBody } from '@studentos/shared';

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL is not set');
  }
  return url;
}

// Thrown whenever the backend responds with {success: false, ...}, or when
// the request never reached the backend at all (T8.10) — always a typed
// error, never a raw fetch rejection, so every caller has one shape to
// handle.
export class ApiClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiClientError';
    this.code = body.code;
    this.details = body.details;
  }
}

// --- Token state -------------------------------------------------------------
// Persisted to localStorage (Phase 8: session survives a reload) but always
// mirrored in these module-level variables too, so every read in this file
// is synchronous — no awaiting storage on every request.

const STORAGE_KEY = 'studentos.auth.tokens';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let hydrated = false;

function isStoredTokens(value: unknown): value is StoredTokens {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StoredTokens).accessToken === 'string' &&
    typeof (value as StoredTokens).refreshToken === 'string'
  );
}

// Reads localStorage exactly once per page load. Guarded for SSR (no
// `window` on the server) and safe if the stored value is missing or
// corrupt. Every exported function that reads the tokens calls this first.
function hydrate(): void {
  if (hydrated || typeof window === 'undefined') {
    return;
  }
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isStoredTokens(parsed)) {
      accessToken = parsed.accessToken;
      refreshToken = parsed.refreshToken;
    }
  } catch {
    // Corrupt JSON or a disabled/unavailable localStorage (privacy mode,
    // quota) — treat as "no stored session" rather than crashing.
  }
}

function persist(tokens: StoredTokens | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (tokens) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Same as above — the app still works for this tab, it just won't
    // survive a reload.
  }
}

export function setTokens(tokens: StoredTokens): void {
  hydrated = true; // an explicit set is authoritative; don't let a later hydrate() overwrite it
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  persist(tokens);
}

export function clearTokens(): void {
  hydrated = true;
  accessToken = null;
  refreshToken = null;
  persist(null);
}

export function getAccessToken(): string | null {
  hydrate();
  return accessToken;
}

export function getRefreshToken(): string | null {
  hydrate();
  return refreshToken;
}

// True as soon as a token exists to check — used by route guards to decide
// whether there's a session worth verifying with the backend before
// deciding "logged out" (see modules/auth/components/RequireAuth.tsx).
export function hasStoredSession(): boolean {
  hydrate();
  return accessToken !== null;
}

// --- Refresh (single-flight) --------------------------------------------------
// Concurrent 401s share one in-flight refresh call rather than each firing
// their own — otherwise a burst of requests would race to refresh, and all
// but one of those refresh attempts would fail against an already-rotated
// token.

let refreshPromise: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function performRefresh(): Promise<boolean> {
  hydrate();
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${getBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const body = await response.json().catch(() => undefined);

    if (!response.ok || !body?.success) {
      clearTokens();
      return false;
    }

    setTokens({ accessToken: body.data.accessToken, refreshToken: body.data.refreshToken });
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

// --- Core request --------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  hydrate();
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // The request never reached the server at all (backend down, DNS
    // failure, offline) — fetch rejects with a raw TypeError here. Wrap it
    // so callers only ever handle one error shape (T8.10).
    throw new ApiClientError({
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the server. Check your connection and try again.',
    });
  }

  // A 401 gets exactly one refresh-and-retry attempt. If the retried request
  // is itself unauthorized, `isRetry` stops a second attempt — this is what
  // keeps a persistently-invalid session from looping forever.
  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return request<T>(path, options, true);
    }
  }

  // A 204 (e.g. DELETE /subjects/:id, DELETE /attendance/:id) has no body to
  // parse at all — treating "no JSON" as UNEXPECTED_RESPONSE would turn every
  // successful delete into a thrown error.
  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => undefined);

  if (!body || typeof body.success !== 'boolean') {
    throw new ApiClientError({
      code: 'UNEXPECTED_RESPONSE',
      message: 'The server returned an unexpected response.',
    });
  }

  if (!body.success) {
    throw new ApiClientError(body.error as ApiErrorBody);
  }

  return body.data as T;
}

// A multipart upload (e.g. POST /timetable/parse) can't go through request()
// above — that function always JSON-encodes the body and sets
// Content-Type: application/json, which would corrupt the file payload. The
// browser sets its own multipart boundary in Content-Type automatically when
// given a FormData body, so that header is deliberately left unset here.
async function uploadRequest<T>(path: string, file: File, isRetry = false): Promise<T> {
  hydrate();
  const headers = new Headers();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, { method: 'POST', headers, body: formData });
  } catch {
    throw new ApiClientError({
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the server. Check your connection and try again.',
    });
  }

  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return uploadRequest<T>(path, file, true);
    }
  }

  const body = await response.json().catch(() => undefined);
  if (!body || typeof body.success !== 'boolean') {
    throw new ApiClientError({
      code: 'UNEXPECTED_RESPONSE',
      message: 'The server returned an unexpected response.',
    });
  }
  if (!body.success) {
    throw new ApiClientError(body.error as ApiErrorBody);
  }
  return body.data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => uploadRequest<T>(path, file),
};
