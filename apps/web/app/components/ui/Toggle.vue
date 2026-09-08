<script setup lang="ts">
import { Toggle } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 toggle button: a single icon/label button whose pressed state is the
 * secondary-container tonal pill. Works standalone (v-model:pressed).
 */
const props = defineProps<{ class?: HTMLAttributes['class'] }>();

const pressed = defineModel<boolean>('pressed', { default: false });
</script>

<template>
  <Toggle
    v-model:pressed="pressed"
    :class="
      cn(
        // aria-pressed (not data-state): when a Tooltip wraps this toggle via
        // as-child, the merged element's data-state belongs to the TOOLTIP
        // (open/closed) and clobbers the toggle's on/off.
        'touch-target relative inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant outline-none transition-colors hover:bg-on-surface-variant/10 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-secondary-container aria-pressed:text-on-secondary-container',
        props.class,
      )
    "
  >
    <slot />
  </Toggle>
</template>
