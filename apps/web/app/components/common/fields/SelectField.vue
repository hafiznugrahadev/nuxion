<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef, ref, computed, watch, nextTick } from 'vue';
import { cn } from '~/lib/utils';
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui';

const props = defineProps<{
  name: string;
  label?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  multiple?: boolean;
  hint?: string;
}>();

const { value, errorMessage } = useField<string | string[]>(toRef(props, 'name'));

const open = ref(false);
const search = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

const filteredOptions = computed(() =>
  !search.value
    ? props.options
    : props.options.filter((opt) => opt.label.toLowerCase().includes(search.value.toLowerCase())),
);

// Single-select helpers
const singleValue = computed(() => (props.multiple ? '' : ((value.value as string) ?? '')));
const selectedLabel = computed(
  () => props.options.find((opt) => opt.value === singleValue.value)?.label ?? '',
);

// Multi-select helpers
const multiValues = computed<string[]>(() =>
  props.multiple ? ((value.value as string[]) ?? []) : [],
);
const selectedItems = computed(() =>
  multiValues.value.map((v) => ({
    value: v,
    label: props.options.find((o) => o.value === v)?.label ?? v,
  })),
);

const isSelected = (optValue: string) =>
  props.multiple ? multiValues.value.includes(optValue) : singleValue.value === optValue;

watch(open, (isOpen) => {
  if (isOpen) nextTick(() => searchInput.value?.focus());
  else search.value = '';
});

function select(optValue: string) {
  if (props.multiple) {
    const current = multiValues.value;
    value.value = current.includes(optValue)
      ? current.filter((v) => v !== optValue)
      : [...current, optValue];
  } else {
    value.value = optValue;
    open.value = false;
  }
}

function removeTag(optValue: string) {
  value.value = multiValues.value.filter((v) => v !== optValue);
}

const isEmpty = computed(() => (props.multiple ? !multiValues.value.length : !singleValue.value));
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="name" class="text-sm font-medium leading-none">
      {{ label }}<span v-if="required" class="ml-0.5 text-destructive">*</span>
    </label>
    <PopoverRoot v-model:open="open">
      <PopoverTrigger as-child>
        <button
          :id="name"
          type="button"
          :class="
            cn(
              'flex w-full items-center rounded-sm border border-outline bg-transparent px-4 text-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
              multiple ? 'min-h-10 flex-wrap gap-1.5 py-1.5' : 'h-10 py-1',
              isEmpty && 'text-muted-foreground',
              errorMessage &&
                'border-destructive focus-visible:border-destructive focus-visible:ring-destructive',
            )
          "
        >
          <!-- Multi: tags -->
          <template v-if="multiple">
            <span
              v-for="item in selectedItems"
              :key="item.value"
              class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {{ item.label }}
              <span class="opacity-70 hover:opacity-100" @click.stop="removeTag(item.value)">
                <MaterialSymbol name="close" :size="14" />
              </span>
            </span>
            <span v-if="isEmpty" class="flex-1 text-left text-muted-foreground">
              {{ placeholder ?? 'Select…' }}
            </span>
          </template>

          <!-- Single: label -->
          <span v-else class="flex-1 truncate text-left">
            {{ selectedLabel || (placeholder ?? 'Select…') }}
          </span>

          <MaterialSymbol name="unfold_more" :size="18" class="ml-auto shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <!-- Portaled so the panel stacks above later positioned siblings
           (e.g. relative toggle-group chips); rendered inline, they win. -->
      <PopoverPortal>
        <PopoverContent
          class="z-50 rounded-md bg-surface-container-high p-0 text-foreground shadow-theme-md"
          :style="{ width: 'var(--reka-popover-trigger-width)' }"
          :side-offset="4"
        >
          <div class="flex items-center border-b border-outline-variant px-4">
            <input
              ref="searchInput"
              v-model="search"
              class="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-on-surface-variant/85"
              placeholder="Search…"
              @keydown.esc="open = false"
            />
          </div>
          <ul class="max-h-60 overflow-y-auto p-1.5">
            <li v-if="!filteredOptions.length" class="px-3 py-2 text-sm text-muted-foreground">
              No results found.
            </li>
            <li
              v-for="opt in filteredOptions"
              :key="opt.value"
              class="flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm transition-colors hover:bg-on-surface-variant/10"
              @click="select(opt.value)"
            >
              <MaterialSymbol
                name="check"
                :size="18"
                class="mr-2 shrink-0"
                :class="isSelected(opt.value) ? 'opacity-100' : 'opacity-0'"
              />
              {{ opt.label }}
            </li>
          </ul>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
    <p v-if="errorMessage" class="text-xs text-destructive">{{ errorMessage }}</p>
    <p v-else-if="hint" class="text-xs text-on-surface-variant">{{ hint }}</p>
  </div>
</template>
