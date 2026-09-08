<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 outlined text field base. Optional `prefixIcon` (Material Symbols name)
 * renders a non-interactive leading glyph with matching inset padding.
 */
const props = defineProps<{ class?: HTMLAttributes['class']; prefixIcon?: string }>();
const model = defineModel<string | number>();

const BASE =
  'flex h-10 w-full rounded-sm border border-outline bg-transparent px-4 text-sm text-foreground transition-colors placeholder:text-on-surface-variant/85 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50';
</script>

<template>
  <div v-if="prefixIcon" class="relative w-full">
    <MaterialSymbol
      :name="prefixIcon"
      :size="18"
      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
    />
    <input v-model="model" :class="cn(BASE, 'pl-10', props.class)" />
  </div>
  <input v-else v-model="model" :class="cn(BASE, props.class)" />
</template>
