import type { Role } from '@nuxion/shared-types';
import { apiFetch } from '@/lib/use-api';

/**
 * Role catalog fetchers. Reads are admin-scoped on the API; this slice grows
 * into the full roles feature (custom role CRUD) in its own stage — the
 * catalog read exists now because the users module needs it for filters and
 * the assignment form.
 */
export async function listRoles(): Promise<Role[]> {
  return apiFetch<Role[]>('/roles');
}
