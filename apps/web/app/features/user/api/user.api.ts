import type { ApiResponse, Paginated, User } from '@nuxion/shared-types';
import { unwrap, unwrapPaginated } from '~/lib/api-client';
import { useApi } from '~/composables/useApi';
import type { UserListParams } from '../types';
import type { CreateUserValues, UpdateUserValues } from '../schemas/user.schema';

/** Feature fetchers — all go through the shared apiClient (SPEC DRY #4 FE). */
export function useUserApi() {
  const api = useApi();

  return {
    list(params: UserListParams): Promise<Paginated<User>> {
      return api<ApiResponse<User[]>>('/users', { query: params }).then(unwrapPaginated);
    },
    create(body: CreateUserValues): Promise<User> {
      return api<ApiResponse<User>>('/users', { method: 'POST', body }).then(unwrap);
    },
    update(id: string, body: UpdateUserValues): Promise<User> {
      return api<ApiResponse<User>>(`/users/${id}`, { method: 'PATCH', body }).then(unwrap);
    },
    remove(id: string): Promise<User> {
      return api<ApiResponse<User>>(`/users/${id}`, { method: 'DELETE' }).then(unwrap);
    },
  };
}
