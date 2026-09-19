import { createApiClient } from '~/lib/api-client';
import { useAuthStore } from '~/stores/auth';

interface ApiCallOptions extends Record<string, unknown> {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
}

/**
 * Pre-auth endpoints excluded from the 401-retry: retrying them with a refreshed
 * token makes no sense (they mint the tokens) and would recurse. Authenticated
 * endpoints under /auth/* (e.g. /auth/2fa/setup, /auth/passkeys) DO get the retry.
 */
const NO_RETRY_AUTH_ROUTES = [
  '/auth/login',
  '/auth/refresh',
  '/auth/2fa/verify',
  '/auth/webauthn/login/',
];

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
      const noRetry = NO_RETRY_AUTH_ROUTES.some((route) => url.startsWith(route));
      if (status === 401 && !noRetry) {
        const refreshed = await auth.refresh();
        if (refreshed) return await client<T>(url, options as never);
      }
      throw err;
    }
  };
}
