'use client';

import { useQuery } from '@tanstack/react-query';
import { listRoles } from './api';

/** Role catalog query — shared by the users filters and the assignment form. */
export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: listRoles, staleTime: 5 * 60_000 });
}
