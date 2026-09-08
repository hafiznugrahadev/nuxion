<script setup lang="ts">
import {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from 'reka-ui';

/**
 * MD3 basic dialog for destructive confirmations: 28dp corners,
 * surface-container-high, plain scrim, text-button cancel + filled confirm
 * (error fill on the destructive variant). Control with `v-model:open`.
 */
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }>(),
  { confirmText: 'Confirm', cancelText: 'Cancel', destructive: true },
);
const emit = defineEmits<{ confirm: [] }>();

const open = defineModel<boolean>('open', { default: false });
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 z-50 bg-scrim" />
      <AlertDialogContent
        class="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl bg-surface-container-high p-6 shadow-theme-lg focus:outline-none"
      >
        <div class="space-y-2 text-center">
          <AlertDialogTitle class="text-lg font-semibold text-on-surface">
            {{ title }}
          </AlertDialogTitle>
          <AlertDialogDescription v-if="description" class="text-sm text-on-surface-variant">
            {{ description }}
          </AlertDialogDescription>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <AlertDialogCancel as-child>
            <Button variant="ghost">{{ cancelText }}</Button>
          </AlertDialogCancel>
          <AlertDialogAction as-child>
            <Button :variant="destructive ? 'destructive' : 'default'" @click="emit('confirm')">
              {{ confirmText }}
            </Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
