import { useQuery } from '@tanstack/vue-query';
import { useI18n } from '#imports';
import { useApiMutation } from '~/composables/useApiMutation';
import { useRoleApi } from '../api/role.api';
import type { RoleFormValues } from '../schemas/role.schema';

/** Catalog query — shared by this feature, the user form, and the user filter.
 *  Roles change rarely, so a 5-minute stale time keeps dropdowns snappy. */
export function useRoles() {
  const roleApi = useRoleApi();
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRole() {
  const roleApi = useRoleApi();
  const { t } = useI18n();
  return useApiMutation((body: RoleFormValues) => roleApi.create(body), {
    invalidateKeys: ['roles'],
    successMessage: t('roles.toasts.created'),
  });
}

export function useUpdateRole() {
  const roleApi = useRoleApi();
  const { t } = useI18n();
  return useApiMutation(
    (vars: { id: string; body: RoleFormValues }) => roleApi.update(vars.id, vars.body),
    { invalidateKeys: ['roles', 'users'], successMessage: t('roles.toasts.updated') },
  );
}

export function useDeleteRole() {
  const roleApi = useRoleApi();
  const { t } = useI18n();
  return useApiMutation((id: string) => roleApi.remove(id), {
    invalidateKeys: ['roles', 'users'],
    successMessage: t('roles.toasts.deleted'),
  });
}
