<script setup lang="ts">
import { APP_NAME } from '~/lib/constants';
</script>

<template>
  <div class="relative grid min-h-screen lg:grid-cols-2">
    <!-- Language + theme, top-right -->
    <div class="absolute right-5 top-5 z-10 flex items-center gap-2">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>

    <!-- Form side -->
    <div class="flex items-center justify-center bg-background px-5 py-12">
      <div class="w-full max-w-sm">
        <slot />
      </div>
    </div>

    <!-- Brand side: MD3 tonal panel (primary-container), tertiary-container
         logo tile as the single accent. No orbs, grid, or glass. -->
    <div
      class="relative hidden items-center justify-center overflow-hidden bg-primary-container lg:flex"
    >
      <div class="relative z-10 max-w-md px-8 text-center text-on-primary-container">
        <div
          class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-tertiary-container text-on-tertiary-container"
        >
          <MaterialSymbol name="deployed_code" :size="32" />
        </div>
        <h2 class="text-2xl font-semibold tracking-tight">{{ APP_NAME }}</h2>
        <p class="mt-3 text-sm text-on-primary-container">{{ $t('appTagline') }}</p>
      </div>
    </div>
  </div>
</template>
