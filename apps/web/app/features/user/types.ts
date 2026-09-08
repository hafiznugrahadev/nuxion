export type { User } from '@nuxion/shared-types';
export { UserRole } from '@nuxion/shared-types';

export interface UserListParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  search?: string;
  /** Filter by one or more role names (server-side; users holding ANY of them). */
  roles?: string[];
}
