import { UserRole, type User } from '@nuxion/shared-types';

/** Only the public user projection lives in memory; the session cookie is HttpOnly. */

export interface SessionPayload {
  user: User;
}

export interface AuthState {
  user: User | null;
}

let state: AuthState = { user: null };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Subscribe to auth state changes (useSyncExternalStore contract). */
export function subscribeAuth(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Snapshot for useSyncExternalStore. */
export function getAuthState(): AuthState {
  return state;
}

export function setSession(payload: SessionPayload): void {
  state = { user: payload.user };
  emit();
}

export function clearSession(): void {
  state = { user: null };
  emit();
}

/** Derived selectors mirroring the Pinia getters. */
export function isAuthenticated(auth: AuthState): boolean {
  return auth.user !== null;
}

export function hasRole(auth: AuthState, role: UserRole): boolean {
  return auth.user?.roles?.includes(role) ?? false;
}
