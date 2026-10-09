<script setup lang="ts">
import type { AlertDialogContentEmits, AlertDialogContentProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';
import {
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogPortal,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from '~/lib/utils';

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<AlertDialogContentProps & { class?: HTMLAttributes['class'] }>();
const emits = defineEmits<AlertDialogContentEmits>();

const delegatedProps = computed(() => {
  const { class: _, ...rest } = props;
  return rest;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay data-slot="alert-dialog-overlay" class="fixed inset-0 z-[60] bg-scrim" />
    <AlertDialogContent
      data-slot="alert-dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-[60] max-h-[90vh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl bg-surface-container-high p-6 focus:outline-none',
          props.class,
        )
      "
    >
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
