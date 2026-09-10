<script setup lang="ts">
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

export interface TabDef {
  value: string;
  label: string;
  /** Material Symbols name (optional). */
  icon?: string;
}

/**
 * MD3 primary tabs: fixed top row on the page/content, active tab colored
 * primary with a 3dp bottom indicator and semibold label, label-large
 * typography. Panel content per tab comes from the `#tab-{value}` slots.
 */
const props = defineProps<{
  tabs: TabDef[];
  class?: HTMLAttributes['class'];
}>();

const model = defineModel<string>('modelValue', { default: undefined });
</script>

<template>
  <TabsRoot v-model="model" :class="cn('flex flex-col gap-4', props.class)">
    <TabsList class="flex gap-1 border-b border-outline-variant">
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        class="-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-[3px] border-transparent px-4 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MaterialSymbol v-if="tab.icon" :name="tab.icon" :size="18" />
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="tab in tabs"
      :key="tab.value"
      :value="tab.value"
      class="text-sm text-on-surface outline-none"
    >
      <slot :name="`tab-${tab.value}`" />
    </TabsContent>
  </TabsRoot>
</template>
