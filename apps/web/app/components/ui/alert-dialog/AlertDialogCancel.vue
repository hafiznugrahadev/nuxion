<script setup lang="ts">
import type { AlertDialogCancelProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';
import { AlertDialogCancel } from 'reka-ui';
import { cn } from '~/lib/utils';
import Button from '../Button.vue';

const props = defineProps<AlertDialogCancelProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = computed(() => {
  const { class: _, ...rest } = props;
  return rest;
});
</script>

<template>
  <AlertDialogCancel v-bind="delegatedProps" as-child>
    <Button variant="ghost" :class="cn('min-h-11', props.class)"><slot /></Button>
  </AlertDialogCancel>
</template>
