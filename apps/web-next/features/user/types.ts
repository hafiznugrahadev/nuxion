export type { User } from '@nuxion/shared-types';
export { UserRole } from '@nuxion/shared-types';

// The index signature keeps params assignable both to the api-client query
// type and the paginated-query wrapper's Record constraint.
export interface UserListParams extends Record<
  string,
  string | number | boolean | undefined | null | readonly string[]
> {
  page?: number;
  limit?: number;
  search?: string;
  /** Server-side sort (whitelisted by the API: name | email | createdAt). */
  sortBy?: 'name' | 'email' | 'createdAt';
  order?: 'asc' | 'desc';
  /** Filter by one or more role names (server-side; users holding ANY of them). */
  roles?: string[];
}
