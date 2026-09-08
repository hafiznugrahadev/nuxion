import { useAuthStore } from '~/stores/auth';

/**
 * Route guard for authenticated pages. The access token is client-only (in memory,
 * restored from the refresh cookie by `plugins/auth.client.ts`), so this guard runs
 * client-side; on the server it defers to let the client restore the session first.
 * Unauthenticated users are sent to /login with a redirect back to the target.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;

  const auth = useAuthStore();
  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
  }
});
