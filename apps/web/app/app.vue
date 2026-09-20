<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import { useBranding } from '~/composables/useBranding';

// Favicon lives here (not as static nuxt.config links) so the uploaded
// branding favicon wins once set; the state is SSR-seeded, so the right icon
// is in the HTML from the first paint.
const branding = useBranding();
useHead({
  link: [
    {
      rel: 'icon',
      type: 'image/png',
      href: () => branding.value.faviconUrl || '/favicon.png',
    },
    { rel: 'apple-touch-icon', href: () => branding.value.faviconUrl || '/apple-touch-icon.png' },
  ],
});
</script>

<template>
  <!-- YouTube-style top progress bar: animates on route navigation AND while
       API XHRs are in flight (one bar merges both signals). -->
  <XhrProgressBar />
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
