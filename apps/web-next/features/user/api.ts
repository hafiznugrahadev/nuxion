import type { Paginated, User } from '@nuxion/shared-types';
import { apiFetch, apiFetchPaginated } from '@/lib/use-api';
import type { CreateUserValues, UpdateUserValues } from './schemas';
import type { UserListParams } from './types';

/** Feature fetchers — all go through the shared apiFetch (auth, 401-replay). */
export const userApi = {
  list(params: UserListParams): Promise<Paginated<User>> {
    return apiFetchPaginated<User>('/users', { query: params });
  },
  create(body: CreateUserValues): Promise<User> {
    return apiFetch<User>('/users', { method: 'POST', body });
  },
  update(id: string, body: UpdateUserValues): Promise<User> {
    return apiFetch<User>(`/users/${id}`, { method: 'PATCH', body });
  },
  remove(id: string): Promise<User> {
    return apiFetch<User>(`/users/${id}`, { method: 'DELETE' });
  },
};
