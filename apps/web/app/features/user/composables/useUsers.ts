import { type MaybeRefOrGetter, toValue } from 'vue';
import { usePaginatedQuery } from '~/composables/usePaginatedQuery';
import { useApiMutation } from '~/composables/useApiMutation';
import { useUserApi } from '../api/user.api';
import type { UserListParams } from '../types';
import type { CreateUserValues, UpdateUserValues } from '../schemas/user.schema';

/** Paginated users query — composes the generic usePaginatedQuery wrapper. */
export function useUsers(params: MaybeRefOrGetter<UserListParams>) {
  const userApi = useUserApi();
  return usePaginatedQuery(
    'users',
    (p: UserListParams) => userApi.list(p),
    () => toValue(params),
  );
}

export function useCreateUser() {
  const userApi = useUserApi();
  return useApiMutation((body: CreateUserValues) => userApi.create(body), {
    invalidateKeys: ['users'],
    successMessage: 'User created',
  });
}

export function useUpdateUser() {
  const userApi = useUserApi();
  return useApiMutation(
    (vars: { id: string; body: UpdateUserValues }) => userApi.update(vars.id, vars.body),
    { invalidateKeys: ['users'], successMessage: 'User updated' },
  );
}

export function useDeleteUser() {
  const userApi = useUserApi();
  return useApiMutation((id: string) => userApi.remove(id), {
    invalidateKeys: ['users'],
    successMessage: 'User deleted',
  });
}
