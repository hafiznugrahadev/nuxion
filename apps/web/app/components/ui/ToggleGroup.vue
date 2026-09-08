<script setup lang="ts">
import { ToggleGroupRoot, ToggleGroupItem } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

export interface ToggleOption {
  value: string;
  label: string;
  /** Material Symbols name (optional). */
  icon?: string;
}

/**
 * MD3 connected toggle set: pill group where the pressed items take the
 * secondary-container tonal fill (filter/selection semantics).
 */
const props = withDefaults(
  defineProps<{
    options: ToggleOption[];
    type?: 'single' | 'multiple';
    class?: HTMLAttributes['class'];
  }>(),
  { type: 'single' },
);

const model = defineModel<string | string[]>('modelValue', { default: undefined });
</script>

<template>
  <ToggleGroupRoot
    v-model="model"
    :type="type"
    :class="cn('flex flex-wrap items-center gap-2', props.class)"
  >
    <ToggleGroupItem
      v-for="opt in options"
      :key="opt.value"
      :value="opt.value"
      class="touch-target relative inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-on-surface-variant outline-none transition-colors hover:bg-on-surface-variant/10 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-secondary-container aria-pressed:text-on-secondary-container"
    >
      <MaterialSymbol v-if="opt.icon" :name="opt.icon" :size="18" />
      {{ opt.label }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>
