import { describe, expect, it } from 'vitest';
import { isWellKnownRole, roleLabel } from './roles';

const t = (key: string) => `→${key}`;

describe('isWellKnownRole', () => {
  it('matches exactly the three built-ins', () => {
    expect(isWellKnownRole('SUPER_ADMIN')).toBe(true);
    expect(isWellKnownRole('ADMIN')).toBe(true);
    expect(isWellKnownRole('USER')).toBe(true);
    expect(isWellKnownRole('CONTENT_EDITOR')).toBe(false);
    expect(isWellKnownRole('admin')).toBe(false);
  });
});

describe('roleLabel', () => {
  it('localizes known roles through users.roles.*', () => {
    expect(roleLabel('ADMIN', t)).toBe('→users.roles.admin');
    expect(roleLabel('SUPER_ADMIN', t)).toBe('→users.roles.superAdmin');
  });

  it('humanizes custom roles — underscores to spaces, lowercase, no i18n leak', () => {
    expect(roleLabel('CONTENT_EDITOR', t)).toBe('content editor');
    expect(roleLabel('E2E_EDITOR_2', t)).toBe('e2e editor 2');
  });
});
