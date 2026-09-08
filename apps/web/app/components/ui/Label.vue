<script setup lang="ts">
import { Label } from 'reka-ui';
import type { LabelProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

// Vue 3.5 reactive props rest-spread omits `class` (same trick as Checkbox).
const { class: _c, ...delegatedProps } = defineProps<
  LabelProps & { class?: HTMLAttributes['class'] }
>();
</script>

<template>
  <Label
    v-bind="delegatedProps"
    :class="
      cn(
        'select-none text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        _c,
      )
    "
  >
    <slot />
  </Label>
</template>
