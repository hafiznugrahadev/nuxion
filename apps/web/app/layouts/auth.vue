<script setup lang="ts">
import { useBranding } from '~/composables/useBranding';

const branding = useBranding();

/*
 * Auth layout: form on the left, photo panel on the right (lg+ only, the
 * form takes the full width below that). The panel shows one photo picked
 * at random from the bundled `public/images/auth-panels/` set (space, teal
 * seas, blossoms). The pick happens on mount — client-only — so SSR never
 * renders a different photo than the client would (no hydration mismatch);
 * the photo fades in over the scrim-colored fallback once it loads. The
 * fixed scrim + bottom gradient keep the white copy AA in both themes even
 * over a worst-case bright photo (≈5.7:1).
 */
const AUTH_PANELS = [
  'moon-earth',
  'nebula',
  'milky-way',
  'teal-reef',
  'teal-wave',
  'blossom',
  'lavender',
] as const;

const panel = ref<string | null>(null);
const panelLoaded = ref(false);

onMounted(() => {
  // ?? null satisfies noUncheckedIndexedAccess (indexing is always in-range).
  panel.value = AUTH_PANELS[Math.floor(Math.random() * AUTH_PANELS.length)] ?? null;
});
</script>

<template>
  <div class="relative grid min-h-screen lg:grid-cols-2">
    <!-- Language + theme, top-right -->
    <div class="absolute right-5 top-5 z-20 flex items-center gap-2">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>

    <!-- Form side -->
    <div class="flex items-center justify-center bg-background px-5 py-12">
      <div class="w-full max-w-sm">
        <slot />
      </div>
    </div>

    <!-- Brand side: random bundled photo under a scrim that keeps the
         overlaid copy readable in both themes. -->
    <div
      class="relative hidden overflow-hidden bg-brand-navy lg:flex lg:items-center lg:justify-center"
    >
      <img
        v-if="panel"
        :src="`/images/auth-panels/${panel}.webp`"
        alt=""
        class="absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-700"
        :class="panelLoaded ? 'opacity-100' : 'opacity-0'"
        draggable="false"
        @load="panelLoaded = true"
      />
      <div class="absolute inset-0 bg-black/40" aria-hidden="true"></div>
      <div
        class="absolute inset-x-0 bottom-0 h-full bg-linear-to-t from-black/70 to-transparent"
        aria-hidden="true"
      ></div>
      <div id="auth-brand" class="relative z-10 max-w-md px-8 text-center text-white">
        <BrandLogo class="mx-auto mb-6 h-16" />
        <h2 class="text-2xl font-semibold tracking-tight">{{ branding.appName }}</h2>
        <p class="mt-3 text-sm text-white/80">{{ $t('appTagline') }}</p>
      </div>
    </div>
  </div>
</template>
