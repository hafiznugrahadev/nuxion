import { useQuery, useQueryClient } from '@tanstack/vue-query';
import type { User } from '@nuxion/shared-types';
import { useApiMutation } from '~/composables/useApiMutation';
import { useAuthStore } from '~/stores/auth';
import { useProfileApi } from '../api/profile.api';

const ME_KEY = ['me'] as const;

/** The authenticated user's own record (full, incl. createdAt). */
export function useMe() {
  const profileApi = useProfileApi();
  const auth = useAuthStore();

  return useQuery<User>({
    queryKey: ME_KEY,
    queryFn: () => profileApi.me(),
    // Seed from the in-memory session so the card paints instantly, then refetch.
    initialData: () => auth.user ?? undefined,
    enabled: () => auth.isAuthenticated,
  });
}

/** Update the current user's profile (name) and sync session + cache. */
export function useUpdateProfile() {
  const profileApi = useProfileApi();
  const auth = useAuthStore();
  const queryClient = useQueryClient();

  return useApiMutation(profileApi.updateProfile, {
    successMessage: 'Profile updated',
    onSuccess(user) {
      queryClient.setQueryData<User>(ME_KEY, user);
      // Keep the header/menu name + avatar in sync with the in-memory session.
      if (auth.user) auth.user = { ...auth.user, name: user.name, avatarUrl: user.avatarUrl };
    },
  });
}

/** Change the current user's password. */
export function useChangePassword() {
  const profileApi = useProfileApi();
  return useApiMutation(profileApi.changePassword, {
    successMessage: 'Password changed',
  });
}
