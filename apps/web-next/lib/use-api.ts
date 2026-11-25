import { ApiError, apiFieldErrors } from './api-errors';
import { createApiClient, unwrap, unwrapPaginated } from './api-client';
import { clearSession } from './auth-store';
import { xhrProgressEnd, xhrProgressStart } from './xhr-progress';
import type { Paginated } from '@nuxion/shared-types';
import type { RequestOptions } from './api-client';

const PUBLIC_AUTH_ROUTES = ['/auth/login', '/auth/2fa/verify', '/auth/webauthn/login/'];

const client = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE ?? '/api',
  // YouTube-style top bar: one shared bar for every API call through this client.
  onStart: xhrProgressStart,
  onEnd: xhrProgressEnd,
});

/** Expired sessions clear local state; failed mutations are never replayed. */
async function withSession<T>(url: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const status =
      err instanceof ApiError ? (err as ApiError & { status?: number }).status : undefined;
    const isPublicAuth = PUBLIC_AUTH_ROUTES.some((route) => url.startsWith(route));
    if (status === 401 && !isPublicAuth && !Object.keys(apiFieldErrors(err)).length) {
      clearSession();
    }
    throw err;
  }
}

/** API fetch returning the envelope's `data` (throws ApiError on failure). */
export async function apiFetch<T>(url: string, options?: RequestOptions): Promise<T> {
  return withSession(url, async () => unwrap<T>(await client<T>(url, options ?? {})));
}

/** API fetch returning `{ data, meta }` from a paginated envelope. */
export async function apiFetchPaginated<T>(
  url: string,
  options?: RequestOptions,
): Promise<Paginated<T>> {
  return withSession(url, async () => unwrapPaginated<T>(await client<T[]>(url, options ?? {})));
}
