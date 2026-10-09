<script setup lang="ts">
import type { AlertDialogActionProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';
import { AlertDialogAction } from 'reka-ui';
import { cn } from '~/lib/utils';
import Button from '../Button.vue';

const props = defineProps<
  AlertDialogActionProps & { class?: HTMLAttributes['class']; variant?: 'default' | 'destructive' }
>();

const delegatedProps = computed(() => {
  const { class: _, variant: __, ...rest } = props;
  return rest;
});
</script>

<template>
  <AlertDialogAction v-bind="delegatedProps" as-child>
    <Button :variant="props.variant ?? 'default'" :class="cn('min-h-11', props.class)"
      ><slot
    /></Button>
  </AlertDialogAction>
</template>
