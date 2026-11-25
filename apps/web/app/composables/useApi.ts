import { apiFieldErrors } from '~/lib/api-errors';
import { createApiClient } from '~/lib/api-client';
import { xhrProgressEnd, xhrProgressStart } from '~/lib/xhr-progress';
import { useAuthStore } from '~/stores/auth';

interface ApiCallOptions extends Record<string, unknown> {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
}

const PUBLIC_AUTH_ROUTES = ['/auth/login', '/auth/2fa/verify', '/auth/webauthn/login/'];

/** Expired sessions clear local state; failed mutations are never replayed. */
export function useApi() {
  const config = useRuntimeConfig();
  const auth = useAuthStore();
  const client = createApiClient({
    baseURL: config.public.apiBase as string,
    // YouTube-style top bar: one shared bar for every API call through this client.
    onStart: xhrProgressStart,
    onEnd: xhrProgressEnd,
  });

  return async function apiFetch<T>(url: string, options?: ApiCallOptions): Promise<T> {
    try {
      return await client<T>(url, options as never);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const isPublicAuth = PUBLIC_AUTH_ROUTES.some((route) => url.startsWith(route));
      if (status === 401 && !isPublicAuth && !Object.keys(apiFieldErrors(err)).length) {
        auth.clear();
      }
      throw err;
    }
  };
}
