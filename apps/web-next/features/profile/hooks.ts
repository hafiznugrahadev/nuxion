'use client';

import { useApiMutation } from '@/lib/use-api-mutation';
import { getAuthState, setSession } from '@/lib/auth-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { User } from '@nuxion/shared-types';
import { profileApi } from './api';
import type { ChangePasswordInput, UpdateProfileInput } from './types';

const ME_KEY = ['me'];

/** The authenticated user's own record (full, incl. createdAt). */
export function useMe() {
  return useQuery<User>({
    queryKey: ME_KEY,
    queryFn: () => profileApi.me(),
    // Seed from the in-memory session so the card paints instantly, then refetch.
    initialData: () => getAuthState().user ?? undefined,
  });
}

/** Update the current user's profile (name/avatar) and sync session + cache. */
export function useUpdateProfile() {
  const t = useTranslations('profile.toasts');
  const queryClient = useQueryClient();
  return useApiMutation((input: UpdateProfileInput) => profileApi.updateProfile(input), {
    successMessage: t('updated'),
    onSuccess(user) {
      queryClient.setQueryData<User>(ME_KEY, user);
      // Keep the header/menu name + avatar in sync with the in-memory session.
      const state = getAuthState();
      if (state.user && state.accessToken) {
        setSession({ accessToken: state.accessToken, user: { ...state.user, ...user } });
      }
    },
  });
}

/** Change the current user's password. */
export function useChangePassword() {
  const t = useTranslations('profile.toasts');
  return useApiMutation((input: ChangePasswordInput) => profileApi.changePassword(input), {
    successMessage: t('passwordChanged'),
  });
}
