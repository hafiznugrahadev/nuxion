<script setup lang="ts">
import { Toaster } from 'vue-sonner';
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- Global toast outlet (vue-sonner), themed as an MD3 snackbar
       (inverse-surface + inverse-on-surface, see .md3-snackbar in main.css),
       the shared confirmation dialog host (useConfirm), and the command
       palette. Client-only — they touch the DOM directly. -->
  <ClientOnly>
    <Toaster position="bottom-right" :toast-options="{ class: 'md3-snackbar' }" />
    <ConfirmDialog />
    <CommandPalette />
  </ClientOnly>
</template>
