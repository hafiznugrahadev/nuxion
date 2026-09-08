<script setup lang="ts">
import {
  AccordionRoot,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

export interface AccordionItemDef {
  value: string;
  title: string;
  /** Plain-text body; use the `#body-{value}` slot for rich content. */
  content?: string;
}

/**
 * MD3 expandable list: outlined cards (12dp) that expand in place; the
 * chevron rotates 180 degrees with the emphasized easing.
 */
const props = withDefaults(
  defineProps<{
    items: AccordionItemDef[];
    type?: 'single' | 'multiple';
    class?: HTMLAttributes['class'];
  }>(),
  { type: 'single' },
);
</script>

<template>
  <AccordionRoot :type="type" :class="cn('space-y-2', props.class)">
    <AccordionItem
      v-for="item in items"
      :key="item.value"
      :value="item.value"
      class="overflow-hidden rounded-lg border border-outline-variant bg-card"
    >
      <AccordionHeader class="flex">
        <AccordionTrigger
          class="group flex flex-1 items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-on-surface transition-colors hover:bg-on-surface/4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {{ item.title }}
          <MaterialSymbol
            name="expand_more"
            :size="20"
            class="shrink-0 text-on-surface-variant transition-transform duration-200 ease-emphasized group-data-[state=open]:rotate-180"
          />
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent
        class="overflow-hidden text-sm text-on-surface-variant data-[state=closed]:animate-[accordion-up_200ms_ease-emphasized] data-[state=open]:animate-[accordion-down_200ms_ease-emphasized]"
      >
        <div class="border-t border-outline-variant px-4 py-3.5">
          <slot :name="`body-${item.value}`" :item="item">{{ item.content }}</slot>
        </div>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
