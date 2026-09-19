import { useAuthStore } from '~/stores/auth';

/**
 * Admin-only guard. Runs after the `auth` middleware (which handles login), so
 * here an authenticated non-admin gets the dedicated 403 error page (with the
 * session card and a way back to their dashboard) instead of a silent
 * redirect. Client-side because the role lives in the in-memory session.
 */
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return;

  const auth = useAuthStore();
  if (!auth.isAdmin) {
    throw createError({ statusCode: 403, fatal: true });
  }
});
