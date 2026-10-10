import { ApiError } from './api-errors';
import { createApiClient, unwrap } from './api-client';
import { getAuthState } from './auth-store';
import { refreshSession } from './auth-api';
import { xhrProgressEnd, xhrProgressStart } from './xhr-progress';
import type { RequestOptions } from './api-client';

/**
 * Pre-auth endpoints excluded from the 401-retry: retrying them with a
 * refreshed token makes no sense (they mint the tokens) and would recurse.
 * Authenticated endpoints under /auth/* (e.g. /auth/2fa/setup) DO get the
 * retry. Port of the Nuxt variant's useApi composable.
 */
const NO_RETRY_AUTH_ROUTES = [
  '/auth/login',
  '/auth/refresh',
  '/auth/2fa/verify',
  '/auth/webauthn/login/',
];

const client = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE ?? '/api',
  getToken: () => getAuthState().accessToken,
  // YouTube-style top bar: one shared bar for every API call through this client.
  onStart: xhrProgressStart,
  onEnd: xhrProgressEnd,
});

/**
 * API fetch with a transparent 401 → refresh → retry: when a request fails
 * with 401 (expired access token) and carries no field errors, it silently
 * calls refreshSession() once and replays the request with the new token.
 */
export async function apiFetch<T>(url: string, options?: RequestOptions): Promise<T> {
  const request = () => client<T>(url, options ?? {});
  try {
    return unwrap(await request());
  } catch (err) {
    const status =
      err instanceof ApiError ? (err as ApiError & { status?: number }).status : undefined;
    const noRetry = NO_RETRY_AUTH_ROUTES.some((route) => url.startsWith(route));
    if (status === 401 && !noRetry) {
      const refreshed = await refreshSession();
      if (refreshed) return unwrap(await request());
    }
    throw err;
  }
}
