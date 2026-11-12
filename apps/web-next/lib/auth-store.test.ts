import { describe, expect, it } from 'vitest';
import { UserRole } from '@nuxion/shared-types';
import {
  clearSession,
  getAuthState,
  hasRole,
  isAuthenticated,
  setSession,
  subscribeAuth,
  type SessionPayload,
} from './auth-store';

const SESSION: SessionPayload = {
  accessToken: 'tok',
  user: {
    id: 'u1',
    name: 'A B',
    email: 'a@b.c',
    roles: [UserRole.ADMIN],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    twoFactorEnabled: false,
  },
};

describe('auth store', () => {
  it('starts logged out', () => {
    const state = getAuthState();
    expect(isAuthenticated(state)).toBe(false);
    expect(state.user).toBeNull();
  });

  it('setSession populates, clearSession empties', () => {
    setSession(SESSION);
    expect(isAuthenticated(getAuthState())).toBe(true);
    expect(hasRole(getAuthState(), UserRole.ADMIN)).toBe(true);
    clearSession();
    expect(isAuthenticated(getAuthState())).toBe(false);
    expect(getAuthState().user).toBeNull();
  });

  it('hasRole is exact and false for unheld roles', () => {
    setSession(SESSION);
    expect(hasRole(getAuthState(), UserRole.SUPER_ADMIN)).toBe(false);
    expect(hasRole(getAuthState(), UserRole.USER)).toBe(false);
    clearSession();
  });

  it('notifies subscribers on every change and honors unsubscribe', () => {
    const events: string[] = [];
    const unsubscribe = subscribeAuth(() => events.push('tick'));
    setSession(SESSION);
    clearSession();
    unsubscribe();
    setSession(SESSION);
    clearSession();
    expect(events).toHaveLength(2);
  });

  it('uses the server enrollment decision independently of registered TOTP', () => {
    setSession({
      ...SESSION,
      user: { ...SESSION.user, twoFactorEnabled: false },
      enrollmentRequired: true,
    });
    expect(getAuthState().enrollmentRequired).toBe(true);
    setSession({
      ...SESSION,
      user: { ...SESSION.user, twoFactorEnabled: false },
      enrollmentRequired: false,
    });
    expect(getAuthState().enrollmentRequired).toBe(false);
    clearSession();
  });
});
