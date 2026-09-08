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

/** Reusable modal dialog (reka-ui). Control with `v-model:open`. */
const open = defineModel<boolean>('open', { default: false });
defineProps<{ title?: string; description?: string }>();
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <!-- MD3 scrim: plain 32% black, no blur. -->
      <DialogOverlay class="fixed inset-0 z-50 bg-scrim" />
      <!-- MD3 basic dialog: 28dp corners, surface-container-high, elevation 3,
           no border. Scrolls vertically when content overflows (capped at
           90vh); overscroll-contain stops wheel/touch chaining past the
           dialog edges. -->
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl bg-surface-container-high p-6 shadow-theme-lg focus:outline-none"
      >
        <div class="mb-5 flex items-start justify-between gap-4">
          <div class="space-y-1">
            <DialogTitle v-if="title" class="text-lg font-semibold text-foreground">
              {{ title }}
            </DialogTitle>
            <DialogDescription v-if="description" class="text-sm text-muted-foreground">
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose
            class="touch-target relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground"
            aria-label="Close"
          >
            <MaterialSymbol name="close" :size="20" />
          </DialogClose>
        </div>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
