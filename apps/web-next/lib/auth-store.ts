import { UserRole, type User } from '@nuxion/shared-types';

/**
 * Client auth state — the React port of the Nuxt variant's Pinia auth store,
 * as a framework-free external store (useSyncExternalStore subscribes).
 *
 * Best practice with a NestJS JWT backend: the short-lived **access token
 * lives in memory only** (never localStorage — XSS-safe), and the long-lived
 * refresh token is an httpOnly cookie the browser sends automatically to
 * `/auth/*`. On a hard reload the in-memory token is gone, so `ensureSession`
 * (lib/auth-api) silently restores it from the cookie before guards decide.
 */

export interface SessionPayload {
  accessToken: string;
  user: User;
  enrollmentRequired?: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  enrollmentRequired?: boolean;
}

let state: AuthState = { user: null, accessToken: null };
const listeners = new Set<() => void>();
const boundaryListeners = new Set<() => void>();
let generation = 0;

export const getSessionGeneration = () => generation;

export function subscribeSessionBoundary(listener: () => void): () => void {
  boundaryListeners.add(listener);
  return () => {
    boundaryListeners.delete(listener);
  };
}

function resetPrivateState() {
  generation++;
  for (const listener of boundaryListeners) listener();
}

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

export function setSession(payload: SessionPayload, expectedGeneration = generation): boolean {
  if (expectedGeneration !== generation) return false;
  if (
    state.user?.id !== payload.user.id ||
    state.enrollmentRequired !== (payload.enrollmentRequired ?? false)
  )
    resetPrivateState();
  state = {
    user: payload.user,
    accessToken: payload.accessToken,
    enrollmentRequired: payload.enrollmentRequired ?? false,
  };
  emit();
  return true;
}

export function clearSession(): void {
  resetPrivateState();
  state = { user: null, accessToken: null };
  emit();
}

/** Derived selectors mirroring the Pinia getters. */
export function isAuthenticated(auth: AuthState): boolean {
  return !!auth.accessToken;
}

export function hasRole(auth: AuthState, role: UserRole): boolean {
  return auth.user?.roles?.includes(role) ?? false;
}
