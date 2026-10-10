'use client';

import { useApiMutation } from '@/lib/use-api-mutation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { roleApi } from './api';
import type { RoleFormValues } from './schemas';

/** Catalog query — shared by this feature, the user form, and the user filter.
 *  Roles change rarely, so a 5-minute stale time keeps dropdowns snappy. */
export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: () => roleApi.list(), staleTime: 5 * 60_000 });
}

export function useCreateRole() {
  const t = useTranslations('roles.toasts');
  return useApiMutation((body: RoleFormValues) => roleApi.create(body), {
    invalidateKeys: ['roles'],
    successMessage: t('created'),
  });
}

export function useUpdateRole() {
  const t = useTranslations('roles.toasts');
  return useApiMutation(
    (vars: { id: string; body: RoleFormValues }) => roleApi.update(vars.id, vars.body),
    { invalidateKeys: ['roles', 'users'], successMessage: t('updated') },
  );
}

export function useDeleteRole() {
  const t = useTranslations('roles.toasts');
  return useApiMutation((id: string) => roleApi.remove(id), {
    invalidateKeys: ['roles', 'users'],
    successMessage: t('deleted'),
  });
}
