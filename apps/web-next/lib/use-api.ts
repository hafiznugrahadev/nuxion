import { ApiError } from './api-errors';
import { createApiClient, unwrap, unwrapPaginated } from './api-client';
import { getAuthState } from './auth-store';
import { refreshSession } from './auth-api';
import { xhrProgressEnd, xhrProgressStart } from './xhr-progress';
import type { Paginated } from '@nuxion/shared-types';
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
 * Shared retry plumbing: run the request, and on a 401 (expired access token)
 * silently refresh once and replay — unless the route mints tokens itself.
 */
async function withRefreshRetry<T>(
  url: string,
  options: RequestOptions | undefined,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const status =
      err instanceof ApiError ? (err as ApiError & { status?: number }).status : undefined;
    const noRetry = NO_RETRY_AUTH_ROUTES.some((route) => url.startsWith(route));
    if (status === 401 && !noRetry) {
      const refreshed = await refreshSession();
      if (refreshed) return await run();
    }
    throw err;
  }
}

/** API fetch returning the envelope's `data` (throws ApiError on failure). */
export async function apiFetch<T>(url: string, options?: RequestOptions): Promise<T> {
  return withRefreshRetry(url, options, async () => unwrap<T>(await client<T>(url, options ?? {})));
}

/** API fetch returning `{ data, meta }` from a paginated envelope. */
export async function apiFetchPaginated<T>(
  url: string,
  options?: RequestOptions,
): Promise<Paginated<T>> {
  return withRefreshRetry(url, options, async () =>
    unwrapPaginated<T>(await client<T[]>(url, options ?? {})),
  );
}
