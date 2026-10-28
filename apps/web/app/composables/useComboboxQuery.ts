import { useInfiniteQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { Paginated } from '@nuxion/shared-types';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type ComboboxPage<TOption extends ComboboxOption = ComboboxOption> = Paginated<TOption>;

export interface ComboboxSearchParams {
  search: string;
  page: number;
  limit: number;
  signal: AbortSignal;
}

export function getNextComboboxPage<TOption extends ComboboxOption>(
  lastPage: ComboboxPage<TOption>,
) {
  return lastPage.meta.page * lastPage.meta.limit < lastPage.meta.total
    ? lastPage.meta.page + 1
    : undefined;
}

/** Server-side search with debounced terms and paginated result caching. */
export function useComboboxQuery<TOption extends ComboboxOption>(options: {
  queryKey: MaybeRefOrGetter<readonly unknown[]>;
  search: MaybeRefOrGetter<string>;
  loadOptions: (params: ComboboxSearchParams) => Promise<ComboboxPage<TOption>>;
  enabled?: MaybeRefOrGetter<boolean>;
  pageSize?: number;
  debounceMs?: number;
  minSearchLength?: number;
}) {
  const pageSize = options.pageSize ?? 25;
  const search = refDebounced(
    computed(() => toValue(options.search).trim()),
    options.debounceMs ?? 400,
  );
  const enabled = computed(
    () => toValue(options.enabled ?? true) && search.value.length >= (options.minSearchLength ?? 0),
  );
  const query = useInfiniteQuery(() => ({
    queryKey: [...toValue(options.queryKey), search.value],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      options.loadOptions({ search: search.value, page: pageParam, limit: pageSize, signal }),
    getNextPageParam: getNextComboboxPage,
    staleTime: 30_000,
  }));

  const items = computed(() => query.data.value?.pages.flatMap((page) => page.data) ?? []);
  return { ...query, items, debouncedSearch: search };
}
