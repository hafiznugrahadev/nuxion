<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { NuxtError } from '#app';
import { useAuthStore } from '~/stores/auth';
import { APP_NAME } from '~/lib/constants';

/*
 * Dedicated error page (404 / 403 / 500 + generic fallback), adapted from the
 * "Wayfinder Error State" Stitch concept onto Nuxion's monochrome + brand
 * tokens. error.vue replaces app.vue entirely (no layout, no toaster), so the
 * public chrome is inlined here and every in-app navigation goes through
 * clearError() — plain NuxtLinks would leave the error state mounted.
 */

const props = defineProps<{ error: NuxtError }>();

const { t } = useI18n();
const route = useRoute();

// Store access is deliberately lazy + client-only: creating a Pinia store
// during the SSR error render corrupts payload serialization (pinia's
// skipHydrate reducer crashes on a null-prototype payload node), and the
// session card already renders inside <ClientOnly> anyway.
const auth = computed(() => (import.meta.client ? useAuthStore() : null));

type ErrorVariant = 'notFound' | 'forbidden' | 'serverError' | 'generic';

const variant = computed<ErrorVariant>(() => {
  switch (props.error?.statusCode) {
    case 404:
      return 'notFound';
    case 403:
      return 'forbidden';
    case 500:
      return 'serverError';
    default:
      return 'generic';
  }
});

const VARIANTS: Record<
  ErrorVariant,
  {
    img: string;
    imgAlt: string;
    badgeVariant: 'info' | 'warning' | 'destructive' | 'muted';
    badgeIcon: string;
    pingClass: string;
  }
> = {
  notFound: {
    img: '/images/errors/404-lost-in-orbit.webp',
    imgAlt: 'Flying robot lost among scattered letters and numbers',
    badgeVariant: 'info',
    badgeIcon: 'travel_explore',
    pingClass: 'bg-brand-teal',
  },
  forbidden: {
    img: '/images/errors/403-access-denied.webp',
    imgAlt: 'Security robot guarding an access-denied shield',
    badgeVariant: 'warning',
    badgeIcon: 'lock',
    pingClass: 'bg-amber-500',
  },
  serverError: {
    img: '/images/errors/500-server-trouble.webp',
    imgAlt: 'Technician robot repairing an overheated server rack',
    badgeVariant: 'destructive',
    badgeIcon: 'warning',
    pingClass: 'bg-rose-500',
  },
  generic: {
    img: '/images/errors/500-server-trouble.webp',
    imgAlt: 'Technician robot repairing an overheated server rack',
    badgeVariant: 'muted',
    badgeIcon: 'error',
    pingClass: 'bg-slate-400',
  },
};

const v = computed(() => VARIANTS[variant.value]);

const badgeLabel = computed(() =>
  variant.value === 'generic'
    ? t('error.generic.badge', { code: props.error?.statusCode ?? 500 })
    : t(`error.${variant.value}.badge`),
);
const title = computed(() => t(`error.${variant.value}.title`));
const description = computed(() => t(`error.${variant.value}.description`));
// Only the generic fallback surfaces the raw message — the themed variants
// keep their reassuring copy (per the Stitch design direction).
const statusMessage = computed(() =>
  variant.value === 'generic' ? props.error?.statusMessage || props.error?.message || '' : '',
);

/** Telemetry card (500): time only exists client-side, so fill it on mount. */
const occurredAt = ref('—');
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

const initials = computed(() => {
  const name = auth.value?.user?.name?.trim();
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
});
const primaryRole = computed(() => auth.value?.user?.roles?.[0] ?? 'GUEST');

const year = new Date().getFullYear();

onMounted(() => {
  occurredAt.value = new Date().toLocaleTimeString();
});

/** clearError + redirect keeps SPA navigation intact from the error screen. */
function go(path: string) {
  void clearError({ redirect: path });
}

function reloadPage() {
  window.location.reload();
}

async function signOut() {
  await auth.value?.logout();
  clearError({ redirect: '/login' });
}

async function copyDetails() {
  const lines = [
    'Nuxion error report',
    `Status: ${props.error?.statusCode ?? 500}`,
    `Page: ${route.fullPath}`,
    `Time: ${occurredAt.value}`,
  ];
  const message = props.error?.statusMessage || props.error?.message;
  if (message) lines.push(`Message: ${message}`);
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    copied.value = true;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Clipboard unavailable (permissions/iframe) — the telemetry stays
    // on-screen, nothing else to do.
  }
}

useHead({
  title: `${props.error?.statusCode ?? 500} · ${APP_NAME}`,
  meta: [{ name: 'robots', content: 'noindex' }],
});
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background text-on-surface" data-testid="error-page">
    <!-- Chrome: error.vue renders without app.vue, so inline the public bar. -->
    <header
      class="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/40 bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl"
    >
      <div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="/" class="flex shrink-0 items-center gap-3" @click.prevent="go('/')">
          <BrandLogo class="h-8" />
          <span class="text-base font-semibold tracking-tight text-on-surface">
            {{ APP_NAME }}
          </span>
        </a>
        <div class="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="relative flex-1 overflow-hidden pt-16">
      <!-- Ambient brand glows (Stitch ambience, Nuxion palette). -->
      <div
        class="pointer-events-none absolute -left-24 top-1/4 -z-10 h-96 w-96 rounded-full bg-brand-blue/10 blur-3xl dark:bg-brand-mint/10"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -right-16 bottom-8 -z-10 h-80 w-80 rounded-full bg-brand-teal/10 blur-3xl dark:bg-brand-teal/15"
        aria-hidden="true"
      />

      <div
        class="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:py-16"
      >
        <!-- Left: illustration card. Always light in both themes (the mirror
             of the landing's always-dark terminal) — Stitch art has a white
             canvas, so inner badges use fixed slate colors, not theme tokens. -->
        <div class="order-2 lg:order-1 lg:col-span-6">
          <div class="relative mx-auto aspect-square w-full max-w-lg">
            <div
              class="absolute inset-6 rounded-full bg-brand-blue/10 blur-2xl dark:bg-brand-mint/10"
              aria-hidden="true"
            />
            <div
              class="relative h-full w-full overflow-hidden rounded-2xl border border-outline-variant/50 bg-white shadow-xl dark:border-white/10"
            >
              <img
                :src="v.img"
                :alt="v.imgAlt"
                class="h-full w-full select-none object-contain p-4"
                draggable="false"
              />
            </div>

            <!-- Floating status badge (top-right). -->
            <div
              class="absolute right-3 top-4 z-10 hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 shadow-md backdrop-blur-md sm:flex"
            >
              <span class="relative flex h-2 w-2" aria-hidden="true">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  :class="v.pingClass"
                />
                <span class="relative inline-flex h-2 w-2 rounded-full" :class="v.pingClass" />
              </span>
              <MaterialSymbol
                :name="
                  variant === 'notFound'
                    ? 'satellite_alt'
                    : variant === 'forbidden'
                      ? 'security'
                      : 'monitor_heart'
                "
                :size="15"
                class="text-slate-600"
              />
              <span class="text-xs font-medium text-slate-700">
                {{
                  variant === 'notFound'
                    ? $t('error.notFound.signal')
                    : variant === 'forbidden'
                      ? $t('error.forbidden.protocol')
                      : $t('error.serverError.diagnostics')
                }}
              </span>
            </div>

            <!-- Floating mono tag (bottom-left). -->
            <div
              class="absolute bottom-4 left-3 z-10 hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1.5 shadow-md backdrop-blur-md sm:flex"
            >
              <MaterialSymbol
                :name="variant === 'forbidden' ? 'verified_user' : 'my_location'"
                :size="15"
                class="text-slate-500"
              />
              <div class="flex flex-col text-left leading-tight">
                <span
                  v-if="variant === 'forbidden'"
                  class="text-[10px] uppercase tracking-wider text-slate-500"
                >
                  {{ $t('error.forbidden.permission') }}
                </span>
                <span class="font-mono text-xs font-bold text-slate-700">
                  {{
                    variant === 'notFound'
                      ? '0x404_VOID'
                      : variant === 'forbidden'
                        ? 'LEVEL_0_RESTRICTED'
                        : '#SRV-500-ENG'
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: status, copy, and recovery actions. -->
        <div class="order-1 flex flex-col items-start text-left lg:order-2 lg:col-span-6">
          <Badge :variant="v.badgeVariant" class="mb-4 gap-1.5 uppercase tracking-wider">
            <MaterialSymbol :name="v.badgeIcon" :size="16" fill />
            {{ badgeLabel }}
          </Badge>

          <h1 class="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            {{ title }}
          </h1>
          <p class="mt-3 max-w-xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
            {{ description }}
          </p>
          <p v-if="statusMessage" class="mt-2 font-mono text-xs text-outline">
            {{ statusMessage }}
          </p>

          <!-- 403: current session card (auth state is client-only). -->
          <ClientOnly>
            <div
              v-if="variant === 'forbidden' && auth?.user"
              class="mt-6 flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-3 shadow-sm"
              data-testid="error-session-card"
            >
              <div class="flex min-w-0 items-center gap-3">
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-sm font-bold text-brand-teal-deep dark:bg-brand-mint/15 dark:text-brand-mint"
                >
                  {{ initials }}
                </span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-on-surface">
                    {{ auth?.user?.name }}
                  </p>
                  <p class="truncate text-xs text-on-surface-variant">
                    {{ auth?.user?.email }}
                  </p>
                </div>
                <Badge variant="muted" class="ml-1 shrink-0 font-mono text-[10px] uppercase">
                  {{ primaryRole }}
                </Badge>
              </div>
              <button
                type="button"
                class="touch-target relative flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                data-testid="error-signout"
                @click="signOut"
              >
                <MaterialSymbol name="switch_account" :size="16" />
                {{ $t('error.forbidden.signOut') }}
              </button>
            </div>
          </ClientOnly>

          <!-- 500: telemetry card with real request data. -->
          <div
            v-if="variant === 'serverError'"
            class="mt-6 w-full max-w-xl rounded-xl border border-outline-variant/50 bg-surface-container-low p-4 shadow-sm"
            data-testid="error-telemetry"
          >
            <div class="mb-3 flex items-center justify-between">
              <span class="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                <MaterialSymbol
                  name="terminal"
                  :size="18"
                  class="text-brand-teal-deep dark:text-brand-mint"
                />
                {{ $t('error.serverError.telemetry') }}
              </span>
              <button
                type="button"
                class="touch-target relative flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-teal-deep transition-colors hover:bg-surface-container dark:text-brand-mint"
                data-testid="error-copy-details"
                @click="copyDetails"
              >
                <MaterialSymbol :name="copied ? 'check' : 'content_copy'" :size="16" />
                {{ copied ? $t('error.serverError.copied') : $t('error.serverError.copyDetails') }}
              </button>
            </div>
            <dl
              class="grid grid-cols-1 gap-3 rounded-lg bg-surface-container-lowest/80 p-3 text-left sm:grid-cols-3"
            >
              <div class="flex flex-col">
                <dt class="text-xs text-on-surface-variant">
                  {{ $t('error.serverError.statusCode') }}
                </dt>
                <dd class="font-mono text-sm font-semibold text-on-surface">
                  {{ error.statusCode ?? 500 }}
                </dd>
              </div>
              <div class="flex min-w-0 flex-col">
                <dt class="text-xs text-on-surface-variant">{{ $t('error.serverError.path') }}</dt>
                <dd class="truncate font-mono text-sm font-semibold text-on-surface">
                  {{ route.fullPath }}
                </dd>
              </div>
              <div class="flex flex-col">
                <dt class="text-xs text-on-surface-variant">{{ $t('error.serverError.time') }}</dt>
                <dd class="font-mono text-sm font-semibold text-on-surface">{{ occurredAt }}</dd>
              </div>
            </dl>
          </div>

          <!-- CTAs. -->
          <div class="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button
              v-if="variant === 'forbidden'"
              size="lg"
              class="bg-brand-navy text-white hover:bg-brand-blue dark:bg-brand-mint/15 dark:text-brand-mint"
              data-testid="error-cta-primary"
              @click="go('/admin/dashboard')"
            >
              <MaterialSymbol name="space_dashboard" :size="20" />
              {{ $t('error.forbidden.backToDashboard') }}
            </Button>
            <Button
              v-else-if="variant === 'serverError' || variant === 'generic'"
              size="lg"
              class="bg-brand-navy text-white hover:bg-brand-blue dark:bg-brand-mint/15 dark:text-brand-mint"
              data-testid="error-cta-primary"
              @click="reloadPage"
            >
              <MaterialSymbol name="refresh" :size="20" />
              {{ $t('error.serverError.reload') }}
            </Button>
            <Button
              v-else
              size="lg"
              class="bg-brand-navy text-white hover:bg-brand-blue dark:bg-brand-mint/15 dark:text-brand-mint"
              data-testid="error-cta-primary"
              @click="go('/')"
            >
              <MaterialSymbol name="home" :size="20" />
              {{ $t('error.backHome') }}
            </Button>

            <Button
              v-if="variant === 'forbidden'"
              variant="outline"
              size="lg"
              data-testid="error-cta-secondary"
              @click="go('/')"
            >
              <MaterialSymbol name="cottage" :size="20" />
              {{ $t('error.backHome') }}
            </Button>
            <Button
              v-else-if="variant === 'serverError' || variant === 'generic'"
              variant="secondary"
              size="lg"
              data-testid="error-cta-secondary"
              @click="go('/')"
            >
              <MaterialSymbol name="home" :size="20" />
              {{ $t('error.backHome') }}
            </Button>
          </div>

          <!-- 404: helpful destination chips. -->
          <div
            v-if="variant === 'notFound'"
            class="mt-6 flex w-full flex-wrap items-center gap-1.5"
            data-testid="error-links"
          >
            <span class="mr-1 text-xs font-medium text-on-surface-variant">
              {{ $t('error.notFound.links') }}
            </span>
            <a
              href="/admin/dashboard"
              class="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:border-outline hover:bg-surface-container-high"
              @click.prevent="go('/admin/dashboard')"
            >
              <MaterialSymbol
                name="space_dashboard"
                :size="16"
                class="text-brand-teal-deep dark:text-brand-mint"
              />
              {{ $t('error.notFound.dashboard') }}
            </a>
            <a
              href="/login"
              class="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:border-outline hover:bg-surface-container-high"
              @click.prevent="go('/login')"
            >
              <MaterialSymbol
                name="login"
                :size="16"
                class="text-brand-teal-deep dark:text-brand-mint"
              />
              {{ $t('error.notFound.login') }}
            </a>
          </div>

          <!-- 403: navigation help chips. -->
          <div
            v-else-if="variant === 'forbidden'"
            class="mt-6 flex w-full flex-wrap items-center gap-1.5"
            data-testid="error-links"
          >
            <span class="mr-1 text-xs font-medium text-on-surface-variant">
              {{ $t('error.forbidden.helpTitle') }}
            </span>
            <a
              href="/admin/profile"
              class="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:border-outline hover:bg-surface-container-high"
              @click.prevent="go('/admin/profile')"
            >
              <MaterialSymbol
                name="person"
                :size="16"
                class="text-brand-teal-deep dark:text-brand-mint"
              />
              {{ $t('error.forbidden.profile') }}
            </a>
            <a
              href="/"
              class="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:border-outline hover:bg-surface-container-high"
              @click.prevent="go('/')"
            >
              <MaterialSymbol
                name="cottage"
                :size="16"
                class="text-brand-teal-deep dark:text-brand-mint"
              />
              {{ $t('error.forbidden.home') }}
            </a>
          </div>
        </div>
      </div>
    </main>

    <footer class="border-t border-outline-variant/40 py-4">
      <p class="mx-auto max-w-7xl px-4 text-center text-xs text-on-surface-variant sm:px-6">
        © {{ year }} {{ APP_NAME }}
      </p>
    </footer>
  </div>
</template>
