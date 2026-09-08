import type { ApiResponse, Paginated, PaginationMeta } from '@nuxion/shared-types';

export interface ApiClientOptions {
  baseURL: string;
  /** Returns the current in-memory access token (attached as a Bearer header). */
  getToken?: () => string | null | undefined;
}

/**
 * SPEC DRY #4 (FE) — single ofetch instance with auth + central error handling.
 * Kept as a factory so `lib/` stays free of `useRuntimeConfig()` / Pinia at import
 * time; the `useApi()` composable wires in runtime config, the auth store, and the
 * transparent 401 → refresh → retry behaviour. `credentials: 'include'` lets the
 * browser send the httpOnly refresh cookie on `/auth/*` calls.
 */
export function createApiClient({ baseURL, getToken }: ApiClientOptions) {
  return $fetch.create({
    baseURL,
    credentials: 'include',
    onRequest({ options }) {
      const token = getToken?.();
      if (token) {
        options.headers = new Headers(options.headers);
        options.headers.set('Authorization', `Bearer ${token}`);
      }
    },
  });
}

/** Unwrap the `{ success, data }` envelope, throwing on the error shape. */
export function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data;
  const msg = Array.isArray(res.message) ? res.message.join(', ') : res.message;
  throw new Error(msg);
}

/** Unwrap a paginated envelope into `{ data, meta }`. */
export function unwrapPaginated<T>(res: ApiResponse<T[]>): Paginated<T> {
  if (res.success) {
    return { data: res.data, meta: res.meta as PaginationMeta };
  }
  const msg = Array.isArray(res.message) ? res.message.join(', ') : res.message;
  throw new Error(msg);
}
