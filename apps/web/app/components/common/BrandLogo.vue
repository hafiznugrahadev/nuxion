<script setup lang="ts">
import { useBranding } from '~/composables/useBranding';

// The uploaded logo (Settings → Branding) wins once set; otherwise the bundled
// mark. Size still comes from the parent via class (width follows the aspect).
const branding = useBranding();
const src = computed(() => branding.value.logoUrl || '/images/nuxion.webp');
</script>

<template>
  <!-- Single brand mark for every theme: full-color, transparent background. -->
  <span class="inline-flex shrink-0 items-center">
    <img :src="src" alt="" aria-hidden="true" class="h-full w-auto" />
  </span>
</template>
