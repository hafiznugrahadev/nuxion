<script setup lang="ts">
import { useCommandPalette } from '~/composables/useCommandPalette';

const { toggleMobile, toggleExpanded, isExpanded, isMobileOpen } = useSidebar();
const { openPalette } = useCommandPalette();

// MD3 top app bar: surface at rest, tonal container + level-2 shadow once the
// page scrolls under it.
const scrolled = ref(false);
function onScroll() {
  scrolled.value = window.scrollY > 0;
}
onMounted(() => {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>

<template>
  <header
    class="sticky top-0 z-30 transition-colors"
    :class="scrolled ? 'bg-surface-container shadow-theme-sm' : 'bg-surface'"
  >
    <div class="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
      <!-- Left: sidebar toggles + search -->
      <div class="flex flex-1 items-center gap-2">
        <!-- Mobile: open off-canvas drawer · Desktop: collapse to icon rail -->
        <button
          type="button"
          class="touch-target relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground lg:hidden"
          :aria-label="isMobileOpen ? 'Close menu' : 'Open menu'"
          @click="toggleMobile"
        >
          <MaterialSymbol
            :name="isMobileOpen ? 'left_panel_close' : 'left_panel_open'"
            :size="22"
          />
        </button>
        <button
          type="button"
          class="touch-target relative hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground lg:inline-flex"
          :aria-label="isExpanded ? 'Collapse sidebar' : 'Expand sidebar'"
          @click="toggleExpanded"
        >
          <MaterialSymbol :name="isExpanded ? 'left_panel_close' : 'left_panel_open'" :size="22" />
        </button>

        <!-- MD3 search bar anchor: full pill on surface-container-high -->
        <button
          type="button"
          class="relative hidden max-w-md flex-1 cursor-text items-center sm:flex"
          @click="openPalette"
        >
          <MaterialSymbol
            name="search"
            :size="18"
            class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <span
            class="flex h-10 w-full items-center rounded-full bg-surface-container-high pl-12 pr-16 text-sm text-muted-foreground"
          >
            {{ $t('commandPalette.placeholder') }}
          </span>
          <span
            class="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-sm border border-outline-variant bg-surface px-1.5 py-0.5 text-xs text-muted-foreground md:inline-flex"
          >
            ⌘ K
          </span>
        </button>
      </div>

      <!-- Right: actions -->
      <div class="flex items-center gap-1 sm:gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationPanel />
        <UserMenu />
      </div>
    </div>
  </header>
</template>
