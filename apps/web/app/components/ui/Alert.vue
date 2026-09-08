<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 tonal notice (banner-like): tinted container + status ink, one icon,
 * title and optional description.
 */
const alertVariants = cva(
  'relative flex w-full gap-3 rounded-lg p-4 text-sm [&>span]:mt-0.5 [&>span]:shrink-0',
  {
    variants: {
      variant: {
        // Tonal pairs per status; same ink in both themes keeps AA contrast.
        info: 'bg-secondary-container text-on-secondary-container',
        success: 'bg-success/12 text-success',
        warning: 'bg-warning/15 text-warning',
        error: 'bg-error-container text-on-error-container',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

type AlertVariants = VariantProps<typeof alertVariants>;
const props = withDefaults(
  defineProps<{
    variant?: AlertVariants['variant'];
    /** Material Symbols name; sensible default per variant. */
    icon?: string;
    class?: HTMLAttributes['class'];
  }>(),
  { variant: 'info' },
);

const DEFAULT_ICON: Record<string, string> = {
  info: 'info',
  success: 'check_circle',
  warning: 'warning',
  error: 'cancel',
};
</script>

<template>
  <div role="alert" :class="cn(alertVariants({ variant }), props.class)">
    <MaterialSymbol :name="icon ?? DEFAULT_ICON[variant ?? 'info'] ?? 'info'" :size="20" />
    <div class="flex-1 space-y-0.5">
      <p class="font-medium"><slot /></p>
      <p v-if="$slots.description" class="text-xs opacity-90">
        <slot name="description" />
      </p>
    </div>
  </div>
</template>
