<script setup lang="ts">
import { APP_NAME } from '~/lib/constants';

/*
 * Auth layout: form on the left, photo panel on the right (lg+ only, the
 * form takes the full width below that). The panel is a theme-invariant
 * photo (like the landing's always-dark terminal): one Unsplash
 * "Earth at night" shot under a fixed scrim, so the brand copy stays white
 * and AA-readable in both light and dark themes.
 */
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

    <!-- Brand side: photo panel (Earth at night, Unsplash) under a scrim that
         keeps the overlaid copy AA in both themes — worst case (photo at 255)
         white-on-scrim ≈ 6.5:1. -->
    <div class="relative hidden overflow-hidden lg:flex">
      <img
        src="/images/auth-panel.webp"
        alt=""
        class="absolute inset-0 h-full w-full select-none object-cover"
        draggable="false"
      />
      <div class="absolute inset-0 bg-black/65" aria-hidden="true"></div>
      <div
        class="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent"
        aria-hidden="true"
      ></div>
      <div class="relative z-10 max-w-md px-8 text-center text-white">
        <BrandLogo class="mx-auto mb-6 h-16" />
        <h2 class="text-2xl font-semibold tracking-tight">{{ APP_NAME }}</h2>
        <p class="mt-3 text-sm text-white/80">{{ $t('appTagline') }}</p>
      </div>
    </div>
  </div>
</template>
