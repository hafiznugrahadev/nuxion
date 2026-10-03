import { describe, expect, it } from 'vitest';
import { intendedRedirect } from './intended-redirect';

const DASHBOARD = '/admin/dashboard';

describe('intendedRedirect', () => {
  it('honours a same-app path left by the auth guard', () => {
    expect(intendedRedirect({ redirect: '/admin/users' })).toBe('/admin/users');
  });

  it('falls back to the dashboard when redirect is missing', () => {
    expect(intendedRedirect({})).toBe(DASHBOARD);
  });

  it('rejects an absolute URL (open redirect)', () => {
    expect(intendedRedirect({ redirect: 'https://evil.example' })).toBe(DASHBOARD);
  });

  it('rejects a protocol-relative URL (open redirect)', () => {
    expect(intendedRedirect({ redirect: '//evil.example' })).toBe(DASHBOARD);
  });

  it('falls back on non-string query values', () => {
    expect(intendedRedirect({ redirect: ['/admin/users', '/x'] })).toBe(DASHBOARD);
    expect(intendedRedirect({ redirect: null })).toBe(DASHBOARD);
  });

  it('falls back on an empty or bare-word value', () => {
    expect(intendedRedirect({ redirect: '' })).toBe(DASHBOARD);
    expect(intendedRedirect({ redirect: 'admin/users' })).toBe(DASHBOARD);
  });
});
