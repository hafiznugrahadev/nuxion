'use client';

import { keepPreviousData, useQuery, type QueryKey } from '@tanstack/react-query';
import type { Paginated } from '@nuxion/shared-types';

/**
 * Uniform paginated query wrapper over react-query — the port of the Nuxt
 * variant's usePaginatedQuery. Changing `params` refetches and keeps previous
 * data to avoid layout flashes during pagination.
 */
export function usePaginatedQuery<T, P extends Record<string, unknown>>(
  key: string,
  fetcher: (params: P) => Promise<Paginated<T>>,
  params: P,
) {
  return useQuery({
    queryKey: [key, params] as QueryKey,
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData,
  });
}
