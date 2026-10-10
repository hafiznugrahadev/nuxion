'use client';

import { usePaginatedQuery } from '@/lib/use-paginated-query';
import { useApiMutation } from '@/lib/use-api-mutation';
import { useTranslations } from 'next-intl';
import { userApi } from './api';
import type { CreateUserValues, UpdateUserValues } from './schemas';
import type { UserListParams } from './types';

/** Paginated users query — composes the generic usePaginatedQuery wrapper. */
export function useUsers(params: UserListParams) {
  return usePaginatedQuery('users', (p: UserListParams) => userApi.list(p), params);
}

export function useCreateUser() {
  const t = useTranslations('users.toasts');
  return useApiMutation((body: CreateUserValues) => userApi.create(body), {
    invalidateKeys: ['users'],
    successMessage: t('created'),
  });
}

export function useUpdateUser() {
  const t = useTranslations('users.toasts');
  return useApiMutation(
    (vars: { id: string; body: UpdateUserValues }) => userApi.update(vars.id, vars.body),
    { invalidateKeys: ['users'], successMessage: t('updated') },
  );
}

export function useDeleteUser() {
  const t = useTranslations('users.toasts');
  return useApiMutation((id: string) => userApi.remove(id), {
    invalidateKeys: ['users'],
    successMessage: t('deleted'),
  });
}
