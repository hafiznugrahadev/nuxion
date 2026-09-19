import type { LocationQuery } from 'vue-router';

/**
 * Where to send an authenticated user coming off a guest page: the `redirect`
 * query left behind by the auth guard when it bounced them to /login, else
 * their dashboard. Only same-app paths are honored — an absolute or
 * protocol-relative value must never turn into an open redirect.
 */
export function intendedRedirect(query: LocationQuery): string {
  const redirect = query.redirect;
  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect;
  }
  return '/admin/dashboard';
}
