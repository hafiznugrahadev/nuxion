<script setup lang="ts">
import type { AlertDialogDescriptionProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';
import { AlertDialogDescription } from 'reka-ui';
import { cn } from '~/lib/utils';

const props = defineProps<AlertDialogDescriptionProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = computed(() => {
  const { class: _, ...rest } = props;
  return rest;
});
</script>

<template>
  <AlertDialogDescription
    data-slot="alert-dialog-description"
    v-bind="delegatedProps"
    :class="cn('text-on-surface-variant text-sm', props.class)"
  >
    <slot />
  </AlertDialogDescription>
</template>
