import { describe, expect, it, vi } from 'vitest';
import { roleLabel } from './roles';

describe('roleLabel', () => {
  it('localizes the known roles through users.roles.*', () => {
    const t = vi.fn((key: string) => `t(${key})`);
    expect(roleLabel('SUPER_ADMIN', t)).toBe('t(users.roles.superAdmin)');
    expect(roleLabel('ADMIN', t)).toBe('t(users.roles.admin)');
    expect(roleLabel('USER', t)).toBe('t(users.roles.user)');
  });

  it('falls back to underscore-spaced lowercase for custom roles', () => {
    const t = vi.fn((key: string) => key);
    expect(roleLabel('REGION_MANAGER', t)).toBe('region manager');
    expect(t).not.toHaveBeenCalled();
  });

  it('spreads every underscore, never leaking raw enum casing', () => {
    expect(roleLabel('SUPER_DUPER_ADMIN', (key) => key)).toBe('super duper admin');
  });
});
