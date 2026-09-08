<script setup lang="ts">
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipArrow,
} from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 plain tooltip: inverse-surface fill, inverse-on-surface label, 4dp
 * corners, small elevation. The default slot is the trigger; the tooltip text
 * comes from the `text` prop or the `#content` slot.
 */
const props = defineProps<{
  text?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <TooltipRoot>
      <TooltipTrigger as-child><slot /></TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          :side="side ?? 'top'"
          :side-offset="6"
          :class="
            cn(
              'touch-target relative z-50 rounded-sm bg-inverse-surface px-2.5 py-1.5 text-xs font-medium text-inverse-on-surface shadow-theme-md',
              props.class,
            )
          "
        >
          <slot name="content">{{ text }}</slot>
          <TooltipArrow class="fill-inverse-surface" :width="8" :height="4" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
