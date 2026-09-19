import { useAuthStore } from '~/stores/auth';
import { intendedRedirect } from '~/lib/intended-redirect';

/**
 * Route guard for guest-only pages (login, register). A user whose session is
 * still valid gets bounced straight to where they were originally heading
 * (`?redirect=`, set by the auth guard) or their dashboard. Client-side for
 * the same reason as `auth.ts`: the token lives in memory, restored by
 * `plugins/auth.client.ts` before middleware runs.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;

  const auth = useAuthStore();
  if (auth.isAuthenticated) {
    return navigateTo(intendedRedirect(to.query));
  }
});
