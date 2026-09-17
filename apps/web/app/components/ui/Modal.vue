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
      <!-- MD3 scrim: plain 32% black, no blur. Fades with the panel (reka-ui
           holds the mount until the closed-state animation ends). -->
      <DialogOverlay
        class="fixed inset-0 z-50 bg-scrim data-[state=open]:animate-[fade-in_250ms_cubic-bezier(0.05,0.7,0.1,1)] data-[state=closed]:animate-[fade-out_150ms_cubic-bezier(0.3,0,0.8,0.15)]"
      />
      <!-- MD3 basic dialog: 28dp corners, surface-container-high, elevation 3,
           no border. Scrolls vertically when content overflows (capped at
           90vh); overscroll-contain stops wheel/touch chaining past the
           dialog edges. -->
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl bg-surface-container-high p-6 shadow-theme-lg focus:outline-none data-[state=open]:animate-[dialog-in_250ms_cubic-bezier(0.05,0.7,0.1,1)] data-[state=closed]:animate-[dialog-out_150ms_cubic-bezier(0.3,0,0.8,0.15)]"
      >
        <div class="mb-5 flex items-start justify-between gap-4">
          <div class="space-y-1">
            <!-- Title always mounts (sr-only when untitled) — DialogContent
                 without a DialogTitle trips reka-ui's a11y warning. -->
            <DialogTitle :class="title ? 'text-lg font-semibold text-foreground' : 'sr-only'">
              {{ title ?? 'Dialog' }}
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
