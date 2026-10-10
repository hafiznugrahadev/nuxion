import type { User } from '@nuxion/shared-types';
import { apiFetch } from '@/lib/use-api';
import type { ChangePasswordInput, UpdateProfileInput } from './types';

/**
 * Self-service profile fetchers — the authenticated user reading/updating
 * their own record via `/users/me`, through the shared client (401-replay).
 */
export const profileApi = {
  me(): Promise<User> {
    return apiFetch<User>('/users/me');
  },
  updateProfile(input: UpdateProfileInput): Promise<User> {
    return apiFetch<User>('/users/me', { method: 'PATCH', body: input });
  },
  changePassword(input: ChangePasswordInput): Promise<null> {
    return apiFetch<null>('/users/me/password', { method: 'PATCH', body: input });
  },
};
