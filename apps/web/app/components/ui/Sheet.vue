<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 modal side sheet: slides in from `side` (default right), 16dp outer
 * corners on the open edge, surface-container-low, plain scrim. Control with
 * `v-model:open`.
 */
const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    side?: 'right' | 'left';
    class?: HTMLAttributes['class'];
  }>(),
  { side: 'right' },
);

const open = defineModel<boolean>('open', { default: false });
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-scrim" />
      <DialogContent
        :class="
          cn(
            'fixed inset-y-0 z-50 flex w-[calc(100%-3rem)] max-w-sm flex-col bg-surface-container-low shadow-theme-lg focus:outline-none',
            side === 'right'
              ? 'right-0 rounded-l-2xl data-[state=open]:animate-[slide-in-right_250ms_cubic-bezier(0.05,0.7,0.1,1)]'
              : 'left-0 rounded-r-2xl data-[state=open]:animate-[slide-in-left_250ms_cubic-bezier(0.05,0.7,0.1,1)]',
            props.class,
          )
        "
      >
        <div
          class="mb-5 flex items-start justify-between gap-4 border-b border-outline-variant p-5"
        >
          <div class="space-y-1">
            <DialogTitle class="text-base font-semibold text-on-surface">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="text-sm text-on-surface-variant">
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose
            class="touch-target relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-on-surface-variant/10 hover:text-on-surface"
            aria-label="Close"
          >
            <MaterialSymbol name="close" :size="20" />
          </DialogClose>
        </div>
        <div class="flex-1 overflow-y-auto overscroll-contain p-5 text-sm text-on-surface">
          <slot />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
