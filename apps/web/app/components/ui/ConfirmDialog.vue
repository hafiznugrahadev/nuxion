<script setup lang="ts">
import type { ConfirmOptions } from '~/composables/useConfirm';

/**
 * Global host for useConfirm(): one shared MD3 AlertDialog for the whole app.
 * Mount once (app.vue); never use this component directly at call sites —
 * call `useConfirm().confirm({ … })` instead.
 */
const { pending, settle } = useConfirm();
const { t } = useI18n();
let returnFocus: HTMLElement | null = null;

// Keep the last options rendered while the dialog plays its close animation
// (pending is nulled the moment the user confirms/cancels).
const view = ref<ConfirmOptions | null>(null);
watch(
  () => pending.value,
  (p) => {
    if (p) {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      view.value = { ...p };
    }
  },
);

const open = computed({
  get: () => !!pending.value,
  set: (next: boolean) => {
    // Reka closes Action before its click handler confirms. Scope dismissal to
    // this request so a subsequent confirmation cannot be cancelled by it.
    const request = pending.value;
    if (!next) queueMicrotask(() => settle(false, request));
  },
});
function restoreFocus(event: Event) {
  event.preventDefault();
  const target = returnFocus;
  // Callers clear their submit state after the promise resolves; wait for Vue
  // to re-enable the originating button before restoring focus.
  nextTick(() => {
    if (!pending.value && target?.isConnected) target.focus();
  });
}
</script>

<template>
  <AlertDialog
    v-model:open="open"
    :title="view?.title ?? ''"
    :description="view?.description"
    :confirm-text="view?.confirmText ?? t('common.confirm')"
    :cancel-text="view?.cancelText ?? t('common.cancel')"
    :destructive="view?.destructive ?? false"
    @confirm="settle(true)"
    @close-auto-focus="restoreFocus"
  />
</template>
