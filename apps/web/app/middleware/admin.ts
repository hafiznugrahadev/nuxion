import { useAuthStore } from '~/stores/auth';

/**
 * Admin-only guard. Runs after the `auth` middleware (which handles login), so
 * here we only need to send authenticated non-admins to the admin dashboard
 * (their authenticated home) instead of the restricted page.
 * Client-side because the role lives in the in-memory session.
 */
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return;

  const auth = useAuthStore();
  if (!auth.isAdmin) {
    return navigateTo('/admin/dashboard');
  }
});
