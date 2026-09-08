<script setup lang="ts">
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 expander: a row trigger that reveals content inline (no card chrome,
 * unlike Accordion). Chevron rotates with the emphasized easing.
 */
const props = defineProps<{ title: string; class?: HTMLAttributes['class'] }>();

const open = defineModel<boolean>('open', { default: false });
</script>

<template>
  <CollapsibleRoot v-model:open="open" :class="cn('w-full', props.class)">
    <CollapsibleTrigger
      class="group flex w-full items-center justify-between gap-3 rounded-sm py-2 text-left text-sm font-medium text-on-surface outline-none transition-colors hover:bg-on-surface/4 focus-visible:ring-2 focus-visible:ring-ring"
    >
      {{ title }}
      <MaterialSymbol
        name="expand_more"
        :size="20"
        class="shrink-0 text-on-surface-variant transition-transform duration-200 ease-emphasized group-data-[state=open]:rotate-180"
      />
    </CollapsibleTrigger>
    <CollapsibleContent
      class="overflow-hidden data-[state=closed]:animate-[collapsible-up_200ms_ease-emphasized] data-[state=open]:animate-[collapsible-down_200ms_ease-emphasized]"
    >
      <div class="pb-3 pt-1 text-sm text-on-surface-variant">
        <slot />
      </div>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
