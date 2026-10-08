import type { ApiResponse, Role } from '@nuxion/shared-types';
import { unwrap } from '~/lib/api-client';
import { useApi } from '~/composables/useApi';
import type { RoleFormValues } from '../schemas/role.schema';

/** Feature fetchers — all go through the shared apiClient (SPEC DRY #4 FE). */
export function useRoleApi() {
  const api = useApi();

  return {
    /** The full catalog: a role list is small by nature, so the API returns
     *  everything and this feature does not paginate. */
    list(): Promise<Role[]> {
      return api<ApiResponse<Role[]>>('/roles').then(unwrap);
    },
    create(body: RoleFormValues): Promise<Role> {
      return api<ApiResponse<Role>>('/roles', { method: 'POST', body }).then(unwrap);
    },
    update(id: string, body: RoleFormValues): Promise<Role> {
      return api<ApiResponse<Role>>(`/roles/${id}`, { method: 'PATCH', body }).then(unwrap);
    },
    remove(id: string): Promise<Role> {
      return api<ApiResponse<Role>>(`/roles/${id}`, { method: 'DELETE' }).then(unwrap);
    },
  };
}
