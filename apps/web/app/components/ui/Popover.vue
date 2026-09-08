<script setup lang="ts">
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * Generic MD3 popover surface: surface-container-high, 8dp corners, level-2
 * elevation. The default slot is the trigger (as-child); panel content is the
 * `#content` slot.
 */
const props = withDefaults(
  defineProps<{
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    class?: HTMLAttributes['class'];
  }>(),
  { side: 'bottom', align: 'center' },
);

const open = defineModel<boolean>('open', { default: undefined });
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child><slot /></PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :side="side"
        :align="align"
        :side-offset="8"
        :class="
          cn(
            'z-50 w-72 rounded-md bg-surface-container-high p-4 text-sm text-on-surface shadow-theme-md outline-none',
            props.class,
          )
        "
      >
        <slot name="content" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
