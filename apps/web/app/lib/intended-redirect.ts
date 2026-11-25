import type { LocationQuery } from 'vue-router';

/**
 * Where to send an authenticated user coming off a guest page: the `redirect`
 * query left behind by the auth guard when it bounced them to /login, else
 * their dashboard. Only same-app paths are honored — an absolute or
 * protocol-relative value must never turn into an open redirect.
 */
export function intendedRedirect(query: LocationQuery): string {
  const redirect = query.redirect;
  if (
    typeof redirect !== 'string' ||
    !redirect.startsWith('/') ||
    redirect.includes('\\') ||
    Array.from(redirect).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x20 || code === 0x7f;
    })
  ) {
    return '/admin/dashboard';
  }
  try {
    const origin = 'https://nuxion.invalid';
    const target = new URL(redirect, origin);
    if (target.origin === origin) return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    // Invalid URLs fall back to the authenticated landing page.
  }
  return '/admin/dashboard';
}
