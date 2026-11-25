import { ApiError } from './api-errors';
import type { ApiResponse, Paginated, PaginationMeta } from '@nuxion/shared-types';

export interface ApiClientOptions {
  baseURL: string;
  /** Called when a request starts / settles (success or error) — wired by
   * `useApi()` to the YouTube-style top progress bar (see lib/xhr-progress.ts). */
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * SPEC DRY #4 (FE) — single ofetch instance with auth + central error handling.
 * Kept as a factory so `lib/` stays free of `useRuntimeConfig()` / Pinia at import
 * time; the `useApi()` composable wires in runtime config, the auth store, and the
 * session lifecycle. The browser sends the HttpOnly session cookie on API calls.
 */
export function createApiClient({ baseURL, onStart, onEnd }: ApiClientOptions) {
  return $fetch.create({
    baseURL,
    credentials: 'include',
    retry: 0,
    onRequest() {
      onStart?.();
    },
    onResponse() {
      onEnd?.();
    },
    onRequestError() {
      onEnd?.();
    },
    onResponseError() {
      onEnd?.();
    },
  });
}

/** Unwrap the `{ success, data }` envelope, throwing on the error shape. */
export function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data;
  throw new ApiError(res);
}

/** Unwrap a paginated envelope into `{ data, meta }`. */
export function unwrapPaginated<T>(res: ApiResponse<T[]>): Paginated<T> {
  if (res.success) {
    return { data: res.data, meta: res.meta as PaginationMeta };
  }
  throw new ApiError(res);
}
