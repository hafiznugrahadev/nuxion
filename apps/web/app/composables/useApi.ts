import { createApiClient } from '~/lib/api-client';
import { useAuthStore } from '~/stores/auth';

interface ApiCallOptions extends Record<string, unknown> {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
}

/**
 * Runtime-config-aware API client with a transparent 401 → refresh → retry.
 * When a request fails with 401 (expired access token), it silently calls
 * `auth.refresh()` once and replays the request with the new token. Auth routes
 * are excluded to avoid recursion. Returns a typed fetch function (SPEC DRY #4 FE).
 */
export function useApi() {
  const config = useRuntimeConfig();
  const auth = useAuthStore();
  const client = createApiClient({
    baseURL: config.public.apiBase as string,
    getToken: () => auth.accessToken,
  });

  return async function apiFetch<T>(url: string, options?: ApiCallOptions): Promise<T> {
    try {
      return await client<T>(url, options as never);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const isAuthRoute = url.startsWith('/auth/');
      if (status === 401 && !isAuthRoute) {
        const refreshed = await auth.refresh();
        if (refreshed) return await client<T>(url, options as never);
      }
      throw err;
    }
  };
}
