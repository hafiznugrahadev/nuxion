import { useQuery, keepPreviousData, type QueryKey } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { Paginated } from '@nuxion/shared-types';

/**
 * SPEC DRY #5 (FE) — uniform paginated query wrapper over @tanstack/vue-query.
 * `params` is reactive; changing it refetches and keeps previous data to avoid
 * layout flashes during pagination.
 */
export function usePaginatedQuery<T, P extends Record<string, unknown>>(
  key: MaybeRefOrGetter<string>,
  fetcher: (params: P) => Promise<Paginated<T>>,
  params: MaybeRefOrGetter<P>,
) {
  return useQuery({
    queryKey: computed<QueryKey>(() => [toValue(key), toValue(params)]),
    queryFn: () => fetcher(toValue(params)),
    placeholderData: keepPreviousData,
  });
}
