<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { APP_NAME } from '~/lib/constants';

const auth = useAuthStore();
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <!-- Fixed top bar (MD3): surface + blur, brand tile, anchor nav pills. -->
    <header
      class="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/40 bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl"
    >
      <div
        class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6"
      >
        <NuxtLink to="/" class="flex shrink-0 items-center gap-3">
          <BrandLogo class="h-8" />
          <div class="flex flex-col leading-none">
            <span class="text-base font-semibold tracking-tight text-on-surface">
              {{ APP_NAME }}
            </span>
            <span class="mt-1 font-mono text-[11px] text-on-surface-variant">
              NestJS + Nuxt Monorepo
            </span>
          </div>
        </NuxtLink>

        <nav class="hidden items-center gap-1 lg:flex" :aria-label="$t('nav.menu')">
          <a
            href="#features"
            class="rounded-full px-3.5 py-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            {{ $t('home.nav.features') }}
          </a>
          <a
            href="#quickstart"
            class="rounded-full px-3.5 py-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            {{ $t('home.nav.quickstart') }}
          </a>
          <a
            href="#why"
            class="rounded-full px-3.5 py-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            {{ $t('home.nav.why') }}
          </a>
          <a
            href="#stack"
            class="rounded-full px-3.5 py-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            {{ $t('home.nav.stack') }}
          </a>
        </nav>

        <div class="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <!-- Auth state is client-only (in-memory token) — avoid hydration mismatch. -->
          <ClientOnly>
            <Button
              v-if="auth.isAuthenticated"
              size="sm"
              class="active:scale-[0.98]"
              @click="navigateTo('/admin/dashboard')"
            >
              {{ $t('nav.dashboard') }}
            </Button>
            <Button
              v-else
              variant="secondary"
              size="sm"
              class="active:scale-[0.98]"
              @click="navigateTo('/login')"
            >
              {{ $t('nav.login') }}
            </Button>
            <template #fallback>
              <Button variant="secondary" size="sm" @click="navigateTo('/login')">
                {{ $t('nav.login') }}
              </Button>
            </template>
          </ClientOnly>
        </div>
      </div>
    </header>

    <main class="flex-1 pt-16">
      <slot />
    </main>
  </div>
</template>
