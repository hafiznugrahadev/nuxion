import type { Role } from '@nuxion/shared-types';
import { apiFetch } from '@/lib/use-api';
import type { RoleFormValues } from './schemas';

/**
 * Feature fetchers — all go through the shared apiFetch (auth, 401-replay).
 * Reads are ADMIN+, writes SUPER_ADMIN; the API enforces both.
 */
export const roleApi = {
  /** The full catalog: a role list is small by nature, so the API returns
   *  everything and this feature does not paginate. */
  list(): Promise<Role[]> {
    return apiFetch<Role[]>('/roles');
  },
  create(body: RoleFormValues): Promise<Role> {
    return apiFetch<Role>('/roles', { method: 'POST', body });
  },
  update(id: string, body: RoleFormValues): Promise<Role> {
    return apiFetch<Role>(`/roles/${id}`, { method: 'PATCH', body });
  },
  remove(id: string): Promise<Role> {
    return apiFetch<Role>(`/roles/${id}`, { method: 'DELETE' });
  },
};
