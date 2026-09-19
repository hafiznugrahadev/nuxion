<script setup lang="ts">
import { computed } from 'vue';
import { xhrPending } from '~/lib/xhr-progress';

/**
 * YouTube-style top progress bar: one bar for both drivers — in-flight API
 * XHRs (lib/xhr-progress.ts) and route navigation (Nuxt's shared loading
 * indicator state, which <NuxtLoadingIndicator> would render). Rendered here
 * instead of via <NuxtLoadingIndicator> because its internal guards swallow
 * programmatic start() calls during the client lifecycle window, and merging
 * both signals keeps a single bar even when a navigation and its XHRs overlap.
 */
const { isLoading: navigationLoading } = useLoadingIndicator();
const active = computed(() => navigationLoading.value || xhrPending.value > 0);
</script>

<template>
  <div class="xhr-progress-bar" :data-active="active" aria-hidden="true" />
</template>

<style scoped>
/* MD3-consistent: 2px hairline in the brand primary (resolves per theme). */
.xhr-progress-bar {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 9999;
  height: 2px;
  pointer-events: none;
  background: var(--primary);
  transform-origin: 0 50%;
  transform: scaleX(0);
  opacity: 0;
}

/* In flight: grow towards ~90%, decelerating — never looks "stuck at done". */
.xhr-progress-bar[data-active='true'] {
  animation: xhr-progress-grow 8s cubic-bezier(0.1, 0.4, 0.1, 1) forwards;
}

/* Settled: snap to 100% and fade out. */
.xhr-progress-bar[data-active='false'] {
  animation: xhr-progress-done 0.35s ease-out forwards;
}

@keyframes xhr-progress-grow {
  from {
    transform: scaleX(0.02);
    opacity: 1;
  }
  to {
    transform: scaleX(0.9);
    opacity: 1;
  }
}

@keyframes xhr-progress-done {
  from {
    transform: scaleX(0.9);
    opacity: 1;
  }
  to {
    transform: scaleX(1);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .xhr-progress-bar[data-active='true'] {
    animation: none;
    transform: scaleX(0.6);
    opacity: 1;
  }
  .xhr-progress-bar[data-active='false'] {
    animation: none;
    transform: scaleX(1);
    opacity: 0;
    transition: opacity 0.2s;
  }
}
</style>
