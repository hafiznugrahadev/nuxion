<script setup lang="ts" generic="TOption extends ComboboxOption">
import { computed, ref, shallowRef, toRef, watch } from 'vue';
import { useField } from 'vee-validate';
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
  ComboboxVirtualizer,
} from 'reka-ui';
import type {
  ComboboxOption,
  ComboboxPage,
  ComboboxSearchParams,
} from '~/composables/useComboboxQuery';
import { useComboboxQuery } from '~/composables/useComboboxQuery';

const props = withDefaults(
  defineProps<{
    name: string;
    label?: string;
    placeholder?: string;
    optionsKey: readonly unknown[];
    loadOptions: (params: ComboboxSearchParams) => Promise<ComboboxPage<TOption>>;
    selectedOptions?: TOption[];
    required?: boolean;
    multiple?: boolean;
    hint?: string;
    pageSize?: number;
    debounceMs?: number;
    minSearchLength?: number;
    disabled?: boolean;
  }>(),
  {
    label: undefined,
    placeholder: undefined,
    hint: undefined,
    selectedOptions: () => [],
    pageSize: 25,
    debounceMs: 400,
    minSearchLength: 0,
  },
);

const { value, errorMessage } = useField<string | string[]>(toRef(props, 'name'));
const { t } = useI18n();
const open = ref(false);
const search = ref('');
const knownSelectedOptions = shallowRef<TOption[]>([...props.selectedOptions]);
watch(
  () => props.selectedOptions,
  (options) => (knownSelectedOptions.value = [...options]),
);
const query = useComboboxQuery<TOption>({
  queryKey: () => ['remote-combobox', ...props.optionsKey],
  search,
  loadOptions: props.loadOptions,
  enabled: open,
  pageSize: props.pageSize,
  debounceMs: props.debounceMs,
  minSearchLength: props.minSearchLength,
});
const waitingForSearch = computed(() => search.value.trim() !== query.debouncedSearch.value);
const belowMinimumLength = computed(() => search.value.trim().length < props.minSearchLength);

const allOptions = computed(() => {
  const byValue = new Map<string, TOption>();
  for (const option of [
    ...props.selectedOptions,
    ...knownSelectedOptions.value,
    ...query.items.value,
  ])
    byValue.set(option.value, option);
  return [...byValue.values()];
});
const selectedValues = computed<string[]>(() => {
  if (props.multiple) return (value.value as string[] | undefined) ?? [];
  const current = value.value as string | undefined;
  return current ? [current] : [];
});
const selectedOption = computed<TOption | undefined>(() =>
  allOptions.value.find((option) => option.value === selectedValues.value[0]),
);
const pickedOptions = computed<TOption[]>(
  () =>
    selectedValues.value.map(
      (selectedValue) =>
        allOptions.value.find((option) => option.value === selectedValue) ?? {
          value: selectedValue,
          label: selectedValue,
        },
    ) as TOption[],
);
const rootValue = computed<TOption | TOption[] | undefined>(() =>
  props.multiple ? pickedOptions.value : selectedOption.value,
);
const mergedSearchOptions = computed(() => {
  const values = new Set(query.items.value.map((option) => option.value));
  return [
    ...query.items.value,
    ...props.selectedOptions.filter((option) => !values.has(option.value)),
  ];
});

function updateSelection(next: unknown) {
  if (props.multiple) {
    const options = Array.isArray(next) ? (next as TOption[]) : [];
    knownSelectedOptions.value = options;
    value.value = options.map((option) => option.value);
    return;
  }
  const option = next as TOption | undefined;
  knownSelectedOptions.value = option ? [option] : [];
  value.value = option?.value ?? '';
}

function removeSelection(optionValue: string) {
  value.value = selectedValues.value.filter((selectedValue) => selectedValue !== optionValue);
  knownSelectedOptions.value = knownSelectedOptions.value.filter(
    (option) => option.value !== optionValue,
  );
}

function onViewportScroll(event: Event) {
  const element = event.currentTarget as HTMLElement;
  if (
    element.scrollHeight - element.scrollTop - element.clientHeight < 80 &&
    query.hasNextPage.value &&
    !query.isFetchingNextPage.value
  ) {
    void query.fetchNextPage();
  }
}

function retry() {
  void query.refetch();
}
</script>

<template>
  <Fieldset :name="name" :label="label" :required="required" :error="errorMessage" :hint="hint">
    <template #default="{ id, describedBy, invalid }">
      <ComboboxRoot
        :model-value="rootValue"
        :multiple="multiple"
        by="value"
        :ignore-filter="true"
        :disabled="disabled"
        open-on-focus
        open-on-click
        @update:model-value="updateSelection"
        @update:open="open = $event"
      >
        <ComboboxAnchor
          :data-invalid="invalid"
          class="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-sm border border-outline bg-transparent px-3 py-1 text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary data-[invalid=true]:border-destructive"
        >
          <span v-if="multiple" class="contents">
            <span
              v-for="option in pickedOptions"
              :key="option.value"
              class="inline-flex max-w-full items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              <span class="max-w-40 truncate">{{ option.label }}</span>
              <button
                type="button"
                class="touch-target inline-flex size-5 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [--touch-slop:-10px]"
                :aria-label="t('common.removeOption', { label: option.label })"
                @click.stop="removeSelection(option.value)"
              >
                <AppIcon name="close" :size="14" />
              </button>
            </span>
          </span>
          <ComboboxInput
            :id="id"
            v-model="search"
            :aria-describedby="describedBy"
            :aria-invalid="invalid"
            :display-value="(option: TOption | undefined) => option?.label ?? ''"
            :placeholder="
              multiple && selectedValues.length ? '' : (placeholder ?? t('common.select'))
            "
            class="min-w-24 flex-1 bg-transparent py-1 text-foreground outline-none placeholder:text-on-surface-variant/85"
          />
          <ComboboxTrigger
            class="touch-target inline-flex size-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :aria-label="t('common.search')"
          >
            <AppIcon name="unfold_more" :size="18" />
          </ComboboxTrigger>
        </ComboboxAnchor>

        <ComboboxPortal>
          <ComboboxContent
            class="z-50 overflow-hidden rounded-md bg-surface-container-high text-foreground shadow-theme-md"
            :style="{ width: 'var(--reka-combobox-trigger-width)' }"
            :side-offset="4"
          >
            <ComboboxViewport
              :class="['overflow-y-auto p-1.5', mergedSearchOptions.length ? 'h-60' : 'max-h-60']"
              @scroll.passive="onViewportScroll"
            >
              <p
                v-if="
                  !belowMinimumLength &&
                  (waitingForSearch || query.isFetching.value) &&
                  !query.isFetchingNextPage.value
                "
                class="px-3 py-2 text-sm text-on-surface-variant"
                role="status"
                aria-live="polite"
              >
                {{ t('common.working') }}
              </p>
              <p
                v-else-if="query.isError.value && !mergedSearchOptions.length"
                class="px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {{ t('common.loadError') }}
                <button
                  type="button"
                  class="ml-2 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  @click.stop="retry"
                >
                  {{ t('common.retry') }}
                </button>
              </p>
              <ComboboxEmpty
                v-else-if="!mergedSearchOptions.length"
                class="px-3 py-2 text-sm text-on-surface-variant"
              >
                {{
                  belowMinimumLength
                    ? t('common.searchMinLength', { count: minSearchLength })
                    : t('common.noResults')
                }}
              </ComboboxEmpty>
              <ComboboxVirtualizer
                v-else
                v-slot="{ option }"
                :options="mergedSearchOptions"
                :estimate-size="36"
                :text-content="(option: TOption) => option.label"
              >
                <ComboboxItem
                  :value="option"
                  :disabled="option.disabled"
                  class="flex min-h-9 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-on-surface-variant/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <AppIcon
                    name="check"
                    :size="18"
                    class="shrink-0"
                    :class="selectedValues.includes(option.value) ? 'opacity-100' : 'opacity-0'"
                  />
                  <span class="truncate">{{ option.label }}</span>
                </ComboboxItem>
              </ComboboxVirtualizer>
              <p
                v-if="query.isFetchNextPageError.value"
                class="px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {{ t('common.loadError') }}
                <button
                  type="button"
                  class="ml-2 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  @click.stop="retry"
                >
                  {{ t('common.retry') }}
                </button>
              </p>
              <p
                v-if="query.isFetchingNextPage.value"
                class="px-3 py-2 text-xs text-on-surface-variant"
                role="status"
              >
                {{ t('common.working') }}
              </p>
            </ComboboxViewport>
          </ComboboxContent>
        </ComboboxPortal>
      </ComboboxRoot>
    </template>
  </Fieldset>
</template>
