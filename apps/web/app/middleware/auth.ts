import { useAuthStore } from '~/stores/auth';

/** Forced TOTP setup page — the only authenticated route exempt from the 2FA gate. */
export const TWO_FACTOR_SETUP_PATH = '/two-factor/setup';

/**
 * Route guard for authenticated pages. The access token is client-only (in memory,
 * restored from the refresh cookie by `plugins/auth.client.ts`), so this guard runs
 * client-side; on the server it defers to let the client restore the session first.
 * Unauthenticated users are sent to /login with a redirect back to the target.
 *
 * When 2FA is enabled via env, users who haven't activated an authenticator yet are
 * kept on the setup page (the "hook") until they complete it — every other
 * authenticated route keeps bouncing them back there.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;

  const auth = useAuthStore();
  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
  }

  const twoFactorEnabled = useRuntimeConfig().public.twoFactorEnabled as boolean;
  if (twoFactorEnabled && !auth.user?.twoFactorEnabled && to.path !== TWO_FACTOR_SETUP_PATH) {
    return navigateTo({ path: TWO_FACTOR_SETUP_PATH, query: { redirect: to.fullPath } });
  }
});
