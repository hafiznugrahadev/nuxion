<script setup lang="ts">
import { ProgressRoot, ProgressIndicator } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 linear progress: 4dp track on surface-container-highest, primary
 * indicator, fully rounded ends.
 */
const props = withDefaults(
  defineProps<{
    /** 0-100 */
    modelValue?: number;
    class?: HTMLAttributes['class'];
  }>(),
  { modelValue: 0 },
);
</script>

<template>
  <ProgressRoot
    :model-value="props.modelValue"
    class="relative h-1 w-full overflow-hidden rounded-full bg-surface-container-highest"
    :class="cn(props.class)"
  >
    <ProgressIndicator
      class="h-full rounded-full bg-primary transition-transform duration-300 ease-emphasized"
      :style="{ transform: `translateX(-${100 - props.modelValue}%)` }"
    />
  </ProgressRoot>
</template>
