<script setup lang="ts">
import { HoverCardRoot, HoverCardTrigger, HoverCardPortal, HoverCardContent } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 surface on hover: surface-container-high, 8dp corners, level-2
 * elevation. The default slot is the trigger; content goes in `#content`.
 */
const props = withDefaults(
  defineProps<{
    side?: 'top' | 'right' | 'bottom' | 'left';
    class?: HTMLAttributes['class'];
  }>(),
  { side: 'bottom' },
);
</script>

<template>
  <HoverCardRoot :open-delay="200" :close-delay="150">
    <HoverCardTrigger as-child><slot /></HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent
        :side="side"
        :side-offset="8"
        :class="
          cn(
            'z-50 w-72 rounded-md bg-surface-container-high p-4 text-sm text-on-surface shadow-theme-md outline-none',
            props.class,
          )
        "
      >
        <slot name="content" />
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>
