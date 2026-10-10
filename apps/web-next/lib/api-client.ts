import type { ApiResponse, Paginated, PaginationMeta } from '@nuxion/shared-types';
import { ApiError } from './api-errors';

export interface ApiClientOptions {
  baseURL: string;
  /** Returns the current in-memory access token (attached as a Bearer header). */
  getToken?: () => string | null | undefined;
  /** Called when a request starts / settles (success or error) — wired by the
   * auth layer to the top progress bar. */
  onStart?: () => void;
  onEnd?: () => void;
}

export interface RequestOptions {
  method?: string;
  /** JSON body; a body implies POST unless `method` says otherwise. */
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Fetch-based port of the Nuxt variant's ofetch client: same `{ success,
 * data }` envelope handling and `credentials: 'include'` (the httpOnly
 * refresh cookie rides /auth/* calls), kept as a factory so `lib/` stays free
 * of React/providers at import time. The 401 → refresh → retry behaviour
 * lands with the auth feature; the getToken hook is already honoured.
 */
export function createApiClient({ baseURL, getToken, onStart, onEnd }: ApiClientOptions) {
  return async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    onStart?.();
    try {
      const base = baseURL.replace(/\/$/, '');
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query ?? {})) {
        if (value !== undefined && value !== null) search.set(key, String(value));
      }
      const qs = search.size > 0 ? `?${search.toString()}` : '';

      const headers = new Headers(options.headers);
      const token = getToken?.();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const hasBody = options.body !== undefined;
      if (hasBody) headers.set('content-type', 'application/json');

      let res: Response;
      try {
        res = await fetch(`${base}${path}${qs}`, {
          method: options.method ?? (hasBody ? 'POST' : 'GET'),
          headers,
          credentials: 'include',
          body: hasBody ? JSON.stringify(options.body) : undefined,
          signal: options.signal,
        });
      } catch (cause) {
        throw new ApiError({
          success: false,
          message: 'Network request failed',
          cause: String(cause),
        } as never);
      }

      const body = (await res.json().catch(() => undefined)) as ApiResponse<T> | undefined;
      if (!res.ok || !body || body.success === false) {
        // Mirror ofetch: the parsed envelope rides on the error as `data`
        // (apiFieldErrors reads it); keep a message even for empty bodies.
        const err = new ApiError(
          (body as never) ?? { success: false, message: `Request failed with ${res.status}` },
        );
        (err as ApiError & { status?: number }).status = res.status;
        throw err;
      }
      return body;
    } finally {
      onEnd?.();
    }
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

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
