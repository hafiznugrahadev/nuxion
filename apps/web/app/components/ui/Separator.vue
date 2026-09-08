<script setup lang="ts">
import { Separator } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 divider: outline-variant (decorative), never `outline` — see the MD3
 * color-roles guidance for outlines vs dividers.
 */
const props = withDefaults(
  defineProps<{
    orientation?: 'horizontal' | 'vertical';
    decorative?: boolean;
    class?: HTMLAttributes['class'];
  }>(),
  { orientation: 'horizontal', decorative: true },
);
</script>

<template>
  <Separator
    :orientation="orientation"
    :decorative="decorative"
    :class="
      cn(
        'shrink-0 bg-outline-variant',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
        props.class,
      )
    "
  />
</template>
