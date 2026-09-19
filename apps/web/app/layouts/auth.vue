<script setup lang="ts">
import { APP_NAME } from '~/lib/constants';

/*
 * Auth layout: form on the left, photo panel on the right (lg+ only, the
 * form takes the full width below that). The panel is two stacked photos:
 * a bundled local base (instant, offline-safe) and a daily Lorem Picsum
 * shot seeded with today's date that fades in on top once it loads —
 * offline/blocked, the base simply stays visible. The fixed dark scrim
 * keeps the overlaid copy AA in both themes even over a worst-case
 * pure-white photo (white-on-scrim ≈ 6.5:1).
 */

// en-CA locale → YYYY-MM-DD: same photo for everyone that day, rotating
// at local midnight.
const REMOTE_PANEL = `https://picsum.photos/seed/${new Date().toLocaleDateString('en-CA')}/1600/2000.webp`;

const remoteImg = ref<HTMLImageElement | null>(null);
const remoteLoaded = ref(false);

onMounted(() => {
  // If the daily photo finished loading before hydration, the load event
  // was missed — recover via the element's complete flag.
  if (remoteImg.value?.complete) remoteLoaded.value = true;
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

    <!-- Brand side: layered photo panel under a fixed scrim that keeps the
         overlaid copy AA in both themes. -->
    <div class="relative hidden overflow-hidden lg:flex lg:items-center lg:justify-center">
      <!-- Base layer: bundled local photo, instant + offline-safe -->
      <img
        src="/images/auth-panel.webp"
        alt=""
        class="absolute inset-0 h-full w-full select-none object-cover"
        draggable="false"
      />
      <!-- Daily layer: date-seeded Picsum, fades in when loaded; stays
           transparent when offline so the base remains visible -->
      <img
        ref="remoteImg"
        :src="REMOTE_PANEL"
        alt=""
        class="absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-700"
        :class="remoteLoaded ? 'opacity-100' : 'opacity-0'"
        draggable="false"
        @load="remoteLoaded = true"
      />
      <div class="absolute inset-0 bg-black/65" aria-hidden="true"></div>
      <div
        class="absolute inset-x-0 bottom-0 h-full bg-linear-to-t from-black/70 to-transparent"
        aria-hidden="true"
      ></div>
      <div id="auth-brand" class="relative z-10 max-w-md px-8 text-center text-white">
        <BrandLogo class="mx-auto mb-6 h-16" />
        <h2 class="text-2xl font-semibold tracking-tight">{{ APP_NAME }}</h2>
        <p class="mt-3 text-sm text-white/80">{{ $t('appTagline') }}</p>
      </div>
    </div>
  </div>
</template>
