import { useAuthStore } from '~/stores/auth';

/**
 * Client-only session restore. The access token lives in memory, so a hard reload
 * loses it — here we silently exchange the httpOnly refresh cookie for a fresh
 * token on startup. Runs before route middleware, so guards see the correct state.
 * No-op when there is no valid cookie (returns logged-out).
 */
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore();
  if (!auth.isAuthenticated) {
    await auth.refresh();
  }
});
