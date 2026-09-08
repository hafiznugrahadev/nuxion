<script setup lang="ts">
import type { ThemeMode } from '~/composables/useTheme';

const { mode, isDark, toggle } = useTheme();

// MD3 icon button cycling light → dark → system; the icon shows the CURRENT
// mode and the label names the next one (action label, per a11y convention).
const ICONS: Record<ThemeMode, string> = {
  light: 'light_mode',
  dark: 'dark_mode',
  system: 'brightness_auto',
};
const NEXT_LABEL: Record<ThemeMode, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system theme',
  system: 'Switch to light mode',
};
</script>

<template>
  <!-- Client-only: theme is resolved on the client, avoid hydration mismatch. -->
  <ClientOnly>
    <button
      type="button"
      class="touch-target relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground"
      :aria-label="NEXT_LABEL[mode]"
      :title="`Theme: ${mode}${mode === 'system' ? ` (${isDark ? 'dark' : 'light'})` : ''}`"
      @click="toggle"
    >
      <MaterialSymbol :name="ICONS[mode]" :size="22" />
    </button>
    <template #fallback>
      <div class="h-10 w-10 rounded-full" />
    </template>
  </ClientOnly>
</template>
