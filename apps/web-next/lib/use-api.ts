import { ApiError } from './api-errors';
import { createApiClient, unwrap, unwrapPaginated } from './api-client';
import { getAuthState, getSessionGeneration } from './auth-store';
import { ensureSession, runSessionRequest } from './auth-api';
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
  run: (signal?: AbortSignal) => Promise<T>,
): Promise<T> {
  const generation = getSessionGeneration();
  const guardedRun = async () => {
    const started = getSessionGeneration();
    const request = (signal?: AbortSignal) => {
      if (started !== getSessionGeneration()) throw new Error('Session changed');
      return run(signal);
    };
    const result =
      url === '/auth/2fa/activate' ? await runSessionRequest(request) : await request();
    if (started !== getSessionGeneration()) throw new Error('Session changed');
    return result;
  };
  try {
    return await guardedRun();
  } catch (err) {
    if (generation !== getSessionGeneration()) throw new Error('Session changed', { cause: err });
    const status =
      err instanceof ApiError ? (err as ApiError & { status?: number }).status : undefined;
    const noRetry = NO_RETRY_AUTH_ROUTES.some((route) => url.startsWith(route));
    if (status === 401 && !noRetry) {
      // Single-flight: a hard reload races this retry against the guards'
      // ensureSession restore, and the refresh cookie is single-use — two
      // parallel refreshes would rotate under each other and log the session
      // out. Sharing the in-flight restore keeps exactly one /auth/refresh.
      const refreshed = await ensureSession();
      if (refreshed) {
        if (generation !== getSessionGeneration())
          throw new Error('Session changed', { cause: err });
        return await guardedRun();
      }
    }
    throw err;
  }
}

/** API fetch returning the envelope's `data` (throws ApiError on failure). */
export async function apiFetch<T>(url: string, options?: RequestOptions): Promise<T> {
  return withRefreshRetry(url, options, async (signal) =>
    unwrap<T>(await client<T>(url, { ...options, ...(signal ? { signal } : {}) })),
  );
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
