import type { ApiResponse, User } from '@nuxion/shared-types';
import { unwrap } from '~/lib/api-client';
import { useApi } from '~/composables/useApi';
import type { ChangePasswordInput, UpdateProfileInput } from '../types';

/**
 * Self-service profile fetchers — the authenticated user reading/updating their
 * own record via `/users/me` (SPEC DRY #4 FE). Goes through the shared client so
 * a mid-session token expiry is transparently refreshed and retried.
 */
export function useProfileApi() {
  const api = useApi();

  return {
    me(): Promise<User> {
      return api<ApiResponse<User>>('/users/me').then(unwrap);
    },
    updateProfile(input: UpdateProfileInput): Promise<User> {
      return api<ApiResponse<User>>('/users/me', { method: 'PATCH', body: input }).then(unwrap);
    },
    changePassword(input: ChangePasswordInput): Promise<null> {
      return api<ApiResponse<null>>('/users/me/password', { method: 'PATCH', body: input }).then(
        unwrap,
      );
    },
  };
}
