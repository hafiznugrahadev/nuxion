import { useAuthStore } from '~/stores/auth';

/**
 * Restore the public user from the HttpOnly session cookie before route middleware.
 * No-op when there is no valid cookie (returns logged-out).
 */
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore();
  if (!auth.isAuthenticated) {
    await auth.restoreSession();
  }
});
