<script setup lang="ts">
import type { ConfirmOptions } from '~/composables/useConfirm';

/**
 * Global host for useConfirm(): one shared MD3 AlertDialog for the whole app.
 * Mount once (app.vue); never use this component directly at call sites —
 * call `useConfirm().confirm({ … })` instead.
 */
const { pending, settle } = useConfirm();

// Keep the last options rendered while the dialog plays its close animation
// (pending is nulled the moment the user confirms/cancels).
const view = ref<ConfirmOptions | null>(null);
watch(
  () => pending.value,
  (p) => {
    if (p) view.value = { ...p };
  },
);

const open = computed({
  get: () => !!pending.value,
  set: (next: boolean) => {
    // Defer the "dismissed" resolution by a microtask: reka's AlertDialogAction
    // closes the dialog BEFORE the button's own click handler emits `confirm`,
    // so settling synchronously here would win the race and resolve false.
    // With the deferral, a settle(true) in the same tick lands first and the
    // late settle(false) becomes a no-op (pending is already null).
    if (!next) queueMicrotask(() => settle(false));
  },
});
</script>

<template>
  <AlertDialog
    v-model:open="open"
    :title="view?.title ?? ''"
    :description="view?.description"
    :confirm-text="view?.confirmText ?? (view?.destructive ? 'Delete' : 'Confirm')"
    :cancel-text="view?.cancelText ?? 'Cancel'"
    :destructive="view?.destructive ?? false"
    @confirm="settle(true)"
  />
</template>
