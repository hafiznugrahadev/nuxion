import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { UserRole, type User } from '@nuxion/shared-types';
import { useAuthStore } from './auth';

function user(roles: string[]): User {
  return {
    id: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    email: 'demo@nuxion.test',
    name: 'Demo User',
    roles,
    twoFactorEnabled: false,
  };
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts logged out', () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.isAdmin).toBe(false);
    expect(auth.isSuperAdmin).toBe(false);
  });

  it('setSession stores the public user without a readable session token', () => {
    const auth = useAuthStore();
    auth.setSession({ user: user([UserRole.USER]) });
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user?.email).toBe('demo@nuxion.test');
    expect(auth.$state).not.toHaveProperty('accessToken');
  });

  it('role getters reflect the held roles, not just authentication', () => {
    const auth = useAuthStore();

    auth.setSession({ user: user([UserRole.ADMIN]) });
    expect(auth.isAdmin).toBe(true);
    expect(auth.isSuperAdmin).toBe(false);

    auth.setSession({ user: user([UserRole.SUPER_ADMIN]) });
    expect(auth.isSuperAdmin).toBe(true);

    auth.setSession({ user: user([UserRole.USER]) });
    expect(auth.isAdmin).toBe(false);
  });

  it('clear() wipes the session (logout / failed restoration)', () => {
    const auth = useAuthStore();
    auth.setSession({ user: user([UserRole.ADMIN]) });
    auth.clear();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(auth.isAdmin).toBe(false);
  });
});
