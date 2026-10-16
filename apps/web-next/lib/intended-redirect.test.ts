import { describe, expect, it } from 'vitest';
import { intendedRedirect } from './intended-redirect';

describe('intendedRedirect', () => {
  it('honors a same-app path', () => {
    expect(intendedRedirect(new URLSearchParams('redirect=/admin/users'))).toBe('/admin/users');
  });

  it('falls back to the dashboard without a redirect param', () => {
    expect(intendedRedirect(new URLSearchParams())).toBe('/admin/dashboard');
  });

  it('rejects absolute and protocol-relative values (open redirect)', () => {
    expect(intendedRedirect(new URLSearchParams('redirect=https://evil.test'))).toBe(
      '/admin/dashboard',
    );
    expect(intendedRedirect(new URLSearchParams('redirect=//evil.test'))).toBe('/admin/dashboard');
  });
});

describe('redirect normalization', () => {
  it.each([
    '/\\evil.invalid',
    '/\t/evil.invalid',
    '/\n/evil.invalid',
    '//evil.invalid',
    'https://evil.invalid',
  ])('rejects browser-normalized external input %j', (redirect) => {
    expect(intendedRedirect(new URLSearchParams({ redirect }))).toBe('/admin/dashboard');
  });
  it('preserves a normalized local path, query and fragment', () => {
    const redirect = '/admin/users/../profile?tab=security#passkeys';
    expect(intendedRedirect(new URLSearchParams({ redirect }))).toBe(
      '/admin/profile?tab=security#passkeys',
    );
  });
});
