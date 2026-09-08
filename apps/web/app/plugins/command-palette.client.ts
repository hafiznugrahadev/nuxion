import { useCommandPalette } from '~/composables/useCommandPalette';

export default defineNuxtPlugin(() => {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      useCommandPalette().openPalette();
    }
  });
});
