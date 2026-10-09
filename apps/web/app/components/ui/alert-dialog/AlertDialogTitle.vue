<script setup lang="ts">
import type { AlertDialogTitleProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';
import { AlertDialogTitle } from 'reka-ui';
import { cn } from '~/lib/utils';

const props = defineProps<AlertDialogTitleProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = computed(() => {
  const { class: _, ...rest } = props;
  return rest;
});
</script>

<template>
  <AlertDialogTitle
    data-slot="alert-dialog-title"
    v-bind="delegatedProps"
    :class="cn('text-lg font-semibold text-on-surface', props.class)"
  >
    <slot />
  </AlertDialogTitle>
</template>
