<script setup lang="ts">
import { toast } from 'vue-sonner';
import { useAuthStore } from '~/stores/auth';
import { APP_NAME } from '~/lib/constants';

// Public landing page — no auth required. Redesign after a Google Stitch
// mockup, mapped onto the kit's MD3 lime tokens. Every number shown here is a
// repo fact (ports, versions, TTLs) — nothing invented.
definePageMeta({ layout: 'public' });

const auth = useAuthStore();
const { t } = useI18n();

// Judul tab mengikuti locale aktif (getter = reaktif saat bahasa diganti).
useHead({ title: () => t('home.metaTitle', { app: APP_NAME }) });

// Version shown in the hero chip — keep in sync with the root package.json.
const KIT_VERSION = 'v0.1.0';
const REPO_URL = 'https://github.com/hafiznugrahadev/nuxion';

// Install commands: REAL, mirrored from README "Getting started". Only the
// step comments are localized; the commands themselves are identical in
// every locale.
const CREATE_CMD = 'bun create nuxion@latest my-app';

interface CloneStep {
  comment: string;
  lines: { cmd: string; rest: string }[];
}
const cloneSteps = computed<CloneStep[]>(() => [
  {
    comment: `# 1. ${t('home.install.steps.install')}`,
    lines: [{ cmd: 'bun', rest: ' install' }],
  },
  {
    comment: `# 2. ${t('home.install.steps.init')}`,
    lines: [{ cmd: 'bun', rest: ' run init' }],
  },
  {
    comment: `# 3. ${t('home.install.steps.services')}`,
    lines: [{ cmd: 'docker', rest: ' compose up -d postgres redis' }],
  },
  {
    comment: `# 4. ${t('home.install.steps.prisma')}`,
    lines: [
      { cmd: 'bun', rest: ' run --filter @nuxion/api prisma:generate' },
      { cmd: 'bun', rest: ' run --filter @nuxion/api prisma:deploy' },
      { cmd: 'bun', rest: ' run --filter @nuxion/api db:seed' },
    ],
  },
  {
    comment: `# 5. ${t('home.install.steps.serve')}`,
    lines: [{ cmd: 'bun', rest: ' run serve' }],
  },
]);
const cloneStepsPlain = computed(() =>
  cloneSteps.value
    .flatMap((s) => [s.comment, ...s.lines.map((l) => l.cmd + l.rest), ''])
    .join('\n')
    .trim(),
);

// Terminal mockup: real ports and services, no invented telemetry.
const TERM_LOG = [
  { tag: 'web:nuxt', text: 'ready on http://localhost:3000' },
  { tag: 'api:nest', text: 'ready on http://localhost:8000' },
  { tag: 'shared-types', text: 'built dist/ (ESM + CJS)' },
] as const;
const TERM_SERVICES = 'PostgreSQL 17 • Redis 7 • RustFS • Mailpit';

// "What's inside" bento — everything below exists in the repo right now.
const inside = computed(() => [
  {
    icon: 'shield',
    title: t('home.inside.authTitle'),
    text: t('home.inside.authText'),
    tag: t('home.inside.authTag'),
  },
  {
    icon: 'table_chart',
    title: t('home.inside.datatableTitle'),
    text: t('home.inside.datatableText'),
    tag: t('home.inside.datatableTag'),
  },
  {
    icon: 'widgets',
    title: t('home.inside.uiTitle'),
    text: t('home.inside.uiText'),
    tag: t('home.inside.uiTag'),
  },
  {
    icon: 'sync_alt',
    title: t('home.inside.sharedTitle'),
    text: t('home.inside.sharedText'),
    tag: t('home.inside.sharedTag'),
  },
  {
    icon: 'inventory_2',
    title: t('home.inside.dockerTitle'),
    text: t('home.inside.dockerText'),
    tag: t('home.inside.dockerTag'),
  },
]);

// Why-NestJS section: four reasons + side-by-side rows (i18n-driven, brand
// tint rotation matches the bento cards above).
const whyReasons = computed(() => [
  {
    icon: 'hub',
    tint: 'bg-brand-navy text-white dark:bg-brand-mint/15 dark:text-brand-mint',
    title: t('home.why.c1t'),
    text: t('home.why.c1x'),
  },
  {
    icon: 'verified_user',
    tint: 'bg-brand-teal/15 text-brand-teal-deep dark:bg-brand-teal/20 dark:text-brand-mint',
    title: t('home.why.c2t'),
    text: t('home.why.c2x'),
  },
  {
    icon: 'schedule',
    tint: 'bg-brand-blue/10 text-brand-blue dark:bg-brand-mint/10 dark:text-brand-mint',
    title: t('home.why.c3t'),
    text: t('home.why.c3x'),
  },
  {
    icon: 'alt_route',
    tint: 'bg-gradient-to-br from-brand-navy to-brand-blue text-white',
    title: t('home.why.c4t'),
    text: t('home.why.c4x'),
  },
]);
const whyRows = computed(() =>
  [1, 2, 3, 4].map((i) => ({
    label: t(`home.why.r${i}l`),
    nuxt: t(`home.why.r${i}n`),
    nest: t(`home.why.r${i}s`),
  })),
);

// Stack chips with the versions actually pinned in the repo.
const stack = [
  'Bun 1.3',
  'Turborepo',
  'NestJS 12',
  'Nuxt 4',
  'Vue 3',
  'Tailwind v4',
  'Material Design 3',
  'Prisma 7',
  'PostgreSQL 17',
  'Redis 7',
  'TanStack Query 5',
  'Pinia',
  'VeeValidate + Zod',
  'Docker Compose',
];

const codeTabs = [
  { value: 'shared', label: 'shared-types' },
  { value: 'env', label: '.env' },
  { value: 'turbo', label: 'turbo.json' },
];
const activeCodeTab = ref('shared');

const year = new Date().getFullYear();

async function copy(textToCopy: string) {
  try {
    await navigator.clipboard.writeText(textToCopy);
    toast.success(t('home.copied'));
  } catch {
    toast.error(t('state.error'));
  }
}
</script>

<template>
  <div>
    <!-- ── Hero ─────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden">
      <!-- Animated ambience: blueprint grid panning under a radial mask … -->
      <div aria-hidden="true" class="hero-grid-mask pointer-events-none absolute inset-0">
        <div class="hero-grid" />
      </div>
      <!-- … tonal blobs drifting behind the content … -->
      <div aria-hidden="true" class="pointer-events-none absolute inset-0">
        <div
          class="absolute -left-24 top-16 h-96 w-96 rounded-full bg-primary/10 blur-3xl transform-gpu animate-[hero-drift-a_22s_ease-in-out_infinite] motion-reduce:animate-none"
        />
        <div
          class="absolute -right-28 top-40 h-[26rem] w-[26rem] rounded-full bg-secondary-container/50 blur-3xl transform-gpu animate-[hero-drift-b_28s_ease-in-out_infinite] motion-reduce:animate-none"
        />
        <div
          class="absolute left-1/3 -top-10 h-[30rem] w-[26rem] rounded-full bg-tertiary-container/30 blur-3xl transform-gpu animate-[hero-drift-a_26s_ease-in-out_infinite_reverse] motion-reduce:animate-none"
        />
      </div>
      <!-- … and a soft light sweep. All decorative: no pointer events, frozen
           under prefers-reduced-motion. -->
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          class="absolute inset-y-[-20%] left-0 w-40 bg-gradient-to-r from-transparent via-white/30 to-transparent blur-xl transform-gpu animate-[hero-sweep_10s_ease-in-out_infinite] motion-reduce:animate-none"
        />
      </div>
      <!-- Diagonal cut into the quickstart section (fills its exact bg token). -->
      <svg
        aria-hidden="true"
        class="absolute inset-x-0 bottom-0 h-20 w-full md:h-28"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polygon points="0,100 100,0 100,100" class="fill-surface-container-low" />
      </svg>

      <div class="relative mx-auto max-w-7xl px-4 pb-32 pt-14 sm:px-6 md:pb-40 md:pt-20">
        <div class="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          <!-- Left: pitch -->
          <div class="flex min-w-0 flex-col items-start gap-6 lg:col-span-7">
            <div
              class="inline-flex cursor-default items-center gap-1.5 rounded-full bg-secondary-container px-4 py-0.5 text-xs font-medium text-on-secondary-container shadow-sm"
            >
              <BrandLogo class="h-4" />
              <span>{{ APP_NAME }}</span>
              <span class="mx-1 h-1.5 w-1.5 rounded-full bg-brand-teal" aria-hidden="true" />
              <span class="font-mono text-[11px] text-on-surface-variant">{{ KIT_VERSION }}</span>
            </div>

            <h1
              class="text-4xl font-bold leading-[1.08] tracking-tight text-on-surface sm:text-5xl lg:text-[56px]"
            >
              NestJS + Nuxt<br class="hidden sm:inline" />
              <span
                class="bg-gradient-to-r from-brand-navy via-brand-blue to-brand-teal bg-clip-text text-transparent dark:from-brand-mint dark:via-brand-teal dark:to-brand-mint"
                >Nuxion</span
              >
            </h1>

            <p class="max-w-2xl leading-relaxed text-on-surface-variant">
              {{ $t('home.description') }}
            </p>

            <div class="flex w-full flex-wrap items-center gap-3 pt-1 sm:w-auto">
              <Button
                size="lg"
                class="bg-brand-teal-deep text-white hover:bg-brand-navy active:scale-[0.98]"
                @click="copy(CREATE_CMD)"
              >
                <MaterialSymbol name="terminal" :size="18" />
                {{ $t('home.installCta') }}
                <MaterialSymbol name="arrow_forward" :size="18" class="ml-1 opacity-80" />
              </Button>
              <ClientOnly>
                <Button
                  v-if="auth.isAuthenticated"
                  variant="secondary"
                  size="lg"
                  class="active:scale-[0.98]"
                  @click="navigateTo('/admin/dashboard')"
                >
                  <MaterialSymbol name="login" :size="18" />
                  {{ $t('home.goToDashboard') }}
                </Button>
                <Button
                  v-else
                  variant="secondary"
                  size="lg"
                  class="active:scale-[0.98]"
                  @click="navigateTo('/login')"
                >
                  <MaterialSymbol name="login" :size="18" />
                  {{ $t('home.signIn') }}
                </Button>
                <template #fallback>
                  <Button variant="secondary" size="lg" @click="navigateTo('/login')">
                    <MaterialSymbol name="login" :size="18" />
                    {{ $t('home.signIn') }}
                  </Button>
                </template>
              </ClientOnly>
            </div>

            <!-- Micro spec pills: repo facts only -->
            <div
              class="flex flex-wrap items-center gap-3 pt-2 text-xs font-medium text-on-surface-variant"
            >
              <span class="flex items-center gap-1">
                <MaterialSymbol
                  name="check_circle"
                  :size="16"
                  class="text-brand-teal-deep dark:text-brand-mint"
                />
                {{ $t('home.pills.access') }}
              </span>
              <span class="flex items-center gap-1">
                <MaterialSymbol
                  name="check_circle"
                  :size="16"
                  class="text-brand-teal-deep dark:text-brand-mint"
                />
                {{ $t('home.pills.roles') }}
              </span>
              <span class="flex items-center gap-1">
                <MaterialSymbol
                  name="check_circle"
                  :size="16"
                  class="text-brand-teal-deep dark:text-brand-mint"
                />
                {{ $t('home.pills.docker') }}
              </span>
            </div>
          </div>

          <!-- Right: terminal mockup (always dark, token-based accents) -->
          <div class="min-w-0 w-full lg:col-span-5">
            <div
              class="overflow-hidden rounded-2xl border border-white/10 bg-inverse-surface text-inverse-on-surface shadow-xl dark:bg-surface-container-lowest dark:text-on-surface"
            >
              <div
                class="flex items-center justify-between border-b border-white/10 bg-black/25 px-4 py-2"
              >
                <div class="flex items-center gap-2">
                  <span class="h-3 w-3 rounded-full bg-error" aria-hidden="true" />
                  <span class="h-3 w-3 rounded-full bg-warning" aria-hidden="true" />
                  <span
                    class="h-3 w-3 rounded-full bg-primary-container dark:bg-brand-mint"
                    aria-hidden="true"
                  />
                  <span class="ml-2 font-mono text-[11px] text-white/70"> turbo — parallel </span>
                </div>
                <div class="flex items-center gap-1.5 font-mono text-[11px] text-white/70">
                  <span
                    class="h-2 w-2 animate-pulse rounded-full bg-primary-container dark:bg-brand-mint"
                    aria-hidden="true"
                  />
                  dev:ready
                </div>
              </div>

              <div class="flex flex-col gap-2 p-4 font-mono text-xs leading-relaxed">
                <div class="text-white/60">// bun run serve</div>
                <div v-for="line in TERM_LOG" :key="line.tag" class="flex items-start gap-2">
                  <span class="font-bold text-primary-container dark:text-brand-mint">
                    [{{ line.tag }}]
                  </span>
                  <span>{{ line.text }}</span>
                </div>
                <div
                  class="mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <MaterialSymbol
                    name="memory"
                    :size="16"
                    class="text-primary-container dark:text-brand-mint"
                  />
                  <span class="opacity-80">{{ TERM_SERVICES }}</span>
                </div>
                <div class="flex items-center gap-2 pt-1">
                  <span class="text-primary-container dark:text-brand-mint">$</span>
                  <span>bun run test</span>
                  <span class="font-semibold text-primary-container dark:text-brand-mint"
                    >PASS</span
                  >
                </div>
              </div>

              <div
                class="flex items-center justify-between border-t border-white/10 bg-black/25 px-4 py-2"
              >
                <span class="font-mono text-[11px] opacity-70"> bun create nuxion </span>
                <button
                  type="button"
                  class="touch-target relative flex items-center gap-1 font-mono text-[11px] text-primary-container transition-opacity hover:opacity-80 dark:text-brand-mint"
                  @click="copy(CREATE_CMD)"
                >
                  <MaterialSymbol name="content_copy" :size="14" />
                  {{ $t('home.term.copyScaffold') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Quickstart: scaffolder + manual bootstrap ────────────────── -->
    <section id="quickstart" class="scroll-mt-20 bg-surface-container-low py-16 lg:py-20">
      <div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div class="flex max-w-3xl flex-col gap-2">
          <div
            class="flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-brand-teal-deep dark:text-brand-mint"
          >
            <MaterialSymbol name="terminal" :size="18" />
            {{ $t('home.install.eyebrow') }}
          </div>
          <h2 class="text-3xl font-bold tracking-tight text-on-surface">
            {{ $t('home.install.title') }}
          </h2>
          <p class="leading-relaxed text-on-surface-variant">
            {{ $t('home.install.lead') }}
          </p>
        </div>

        <!-- Scaffolder one-liner -->
        <div
          class="flex flex-col justify-between gap-4 rounded-2xl border border-outline-variant/40 bg-surface p-4 shadow-sm sm:flex-row sm:items-center"
        >
          <div class="flex min-w-0 items-center gap-4">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container"
            >
              <MaterialSymbol name="bolt" :size="20" />
            </div>
            <div class="flex min-w-0 flex-col">
              <span class="text-xs text-on-surface-variant">
                {{ $t('home.install.scaffolderLabel') }}
              </span>
              <code class="truncate font-mono text-sm text-on-surface">{{ CREATE_CMD }}</code>
            </div>
          </div>
          <Button variant="outline" size="sm" class="shrink-0" @click="copy(CREATE_CMD)">
            <MaterialSymbol name="content_copy" :size="16" />
            {{ $t('home.copy') }}
          </Button>
        </div>

        <!-- Manual bootstrap -->
        <div
          class="flex flex-col gap-8 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 md:p-8 lg:flex-row"
        >
          <div class="flex flex-col justify-between gap-6 lg:w-5/12">
            <div class="flex flex-col gap-4">
              <div
                class="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary-container px-3 py-0.5 font-mono text-xs text-on-secondary-container"
              >
                <MaterialSymbol
                  name="alt_route"
                  :size="16"
                  class="text-brand-teal-deep dark:text-brand-mint"
                />
                {{ $t('home.install.manualChip') }}
              </div>
              <h3 class="text-2xl font-semibold text-on-surface">
                {{ $t('home.install.cloneTitle') }}
              </h3>
              <p class="text-sm text-on-surface-variant">
                {{ $t('home.install.cloneLead') }}
              </p>
              <ul class="flex flex-col gap-2 pt-1 text-sm text-on-surface">
                <li class="flex items-center gap-2">
                  <span
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-container"
                  >
                    <MaterialSymbol
                      name="done"
                      :size="14"
                      class="text-brand-teal-deep dark:text-brand-mint"
                    />
                  </span>
                  {{ $t('home.install.checks.workspaces') }}
                </li>
                <li class="flex items-center gap-2">
                  <span
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-container"
                  >
                    <MaterialSymbol
                      name="done"
                      :size="14"
                      class="text-brand-teal-deep dark:text-brand-mint"
                    />
                  </span>
                  {{ $t('home.install.checks.env') }}
                </li>
                <li class="flex items-center gap-2">
                  <span
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-container"
                  >
                    <MaterialSymbol
                      name="done"
                      :size="14"
                      class="text-brand-teal-deep dark:text-brand-mint"
                    />
                  </span>
                  {{ $t('home.install.checks.seed') }}
                </li>
              </ul>
            </div>
            <div
              class="flex items-center gap-4 rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm"
            >
              <MaterialSymbol
                name="verified"
                :size="28"
                class="text-brand-teal-deep dark:text-brand-mint"
              />
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-on-surface">
                  {{ $t('home.install.zeroDriftTitle') }}
                </span>
                <span class="text-xs text-on-surface-variant">
                  {{ $t('home.install.zeroDriftText') }}
                </span>
              </div>
            </div>
          </div>

          <!-- manual-setup.sh terminal -->
          <div
            class="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-inverse-surface text-inverse-on-surface shadow-md lg:w-7/12 dark:bg-surface-container-lowest dark:text-on-surface"
          >
            <div
              class="flex items-center justify-between border-b border-white/10 bg-black/25 px-4 py-2"
            >
              <span class="flex items-center gap-1.5 font-mono text-xs font-semibold opacity-70">
                <MaterialSymbol
                  name="code"
                  :size="16"
                  class="text-primary-container dark:text-brand-mint"
                />
                manual-setup.sh
              </span>
              <button
                type="button"
                class="touch-target relative flex items-center gap-1 font-mono text-xs text-primary-container transition-opacity hover:opacity-80 dark:text-brand-mint"
                @click="copy(cloneStepsPlain)"
              >
                <MaterialSymbol name="copy_all" :size="14" />
                {{ $t('home.install.copyAll') }}
              </button>
            </div>
            <div
              class="flex flex-col gap-4 overflow-x-auto p-4 font-mono text-[13px] leading-[22px]"
            >
              <div
                v-for="(step, si) in cloneSteps"
                :key="si"
                :class="si === 4 && 'mt-1 border-t border-white/10 pt-3'"
              >
                <span class="block select-none text-white/60">{{ step.comment }}</span>
                <div v-for="(line, li) in step.lines" :key="li">
                  <span
                    class="font-bold"
                    :class="
                      line.cmd === 'docker'
                        ? 'text-brand-mint'
                        : 'text-primary-container dark:text-brand-mint'
                    "
                  >
                    {{ line.cmd }} </span
                  >{{ line.rest }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── What's inside (bento) ────────────────────────────────────── -->
    <section id="features" class="scroll-mt-20 py-16 lg:py-24">
      <div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div class="flex max-w-2xl flex-col gap-1">
            <span
              class="font-mono text-xs font-medium uppercase tracking-wider text-brand-teal-deep dark:text-brand-mint"
            >
              {{ $t('home.inside.eyebrow') }}
            </span>
            <h2 class="text-3xl font-bold tracking-tight text-on-surface">
              {{ $t('home.inside.title') }}
            </h2>
            <p class="leading-relaxed text-on-surface-variant">
              {{ $t('home.inside.lead') }}
            </p>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
            <span class="h-2.5 w-2.5 rounded-full bg-brand-teal" aria-hidden="true" />
            {{ $t('home.inside.typed') }}
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <!-- Auth & RBAC: wide card -->
          <div
            class="flex flex-col justify-between gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 transition-colors hover:bg-surface-container-high md:col-span-2"
          >
            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-navy text-white shadow-sm dark:bg-brand-mint/15 dark:text-brand-mint"
                >
                  <MaterialSymbol :name="inside[0]!.icon" :size="24" />
                </div>
                <span
                  class="rounded-full border border-outline-variant/30 bg-surface px-3 py-0.5 font-mono text-xs font-semibold text-brand-teal-deep dark:text-brand-mint"
                >
                  {{ inside[0]!.tag }}
                </span>
              </div>
              <h3 class="text-xl font-semibold text-on-surface">{{ inside[0]!.title }}</h3>
              <p class="max-w-xl text-sm text-on-surface-variant">{{ inside[0]!.text }}</p>
            </div>
            <div
              class="flex flex-wrap items-center gap-4 rounded-2xl border border-outline-variant/30 bg-surface p-4 font-mono text-xs text-on-surface"
            >
              <span class="flex items-center gap-1.5">
                <MaterialSymbol
                  name="key"
                  :size="16"
                  class="text-brand-teal-deep dark:text-brand-mint"
                />
                {{ $t('home.inside.authF1') }}
              </span>
              <span class="flex items-center gap-1.5">
                <MaterialSymbol
                  name="autorenew"
                  :size="16"
                  class="text-brand-teal-deep dark:text-brand-mint"
                />
                {{ $t('home.inside.authF2') }}
              </span>
              <span class="flex items-center gap-1.5">
                <MaterialSymbol
                  name="admin_panel_settings"
                  :size="16"
                  class="text-brand-teal-deep dark:text-brand-mint"
                />
                {{ $t('home.inside.authF3') }}
              </span>
            </div>
          </div>

          <!-- Users datatable -->
          <div
            class="flex flex-col justify-between gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 transition-colors hover:bg-surface-container-high"
          >
            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal/15 text-brand-teal-deep shadow-sm dark:bg-brand-teal/20 dark:text-brand-mint"
                >
                  <MaterialSymbol :name="inside[1]!.icon" :size="24" />
                </div>
                <span
                  class="rounded-full border border-outline-variant/30 bg-surface px-3 py-0.5 font-mono text-xs font-semibold text-brand-teal-deep dark:text-brand-mint"
                >
                  {{ inside[1]!.tag }}
                </span>
              </div>
              <h3 class="text-xl font-semibold text-on-surface">{{ inside[1]!.title }}</h3>
              <p class="text-sm text-on-surface-variant">{{ inside[1]!.text }}</p>
            </div>
            <div
              class="flex items-center justify-between gap-2 rounded-2xl border border-outline-variant/30 bg-surface p-3 text-xs text-on-surface-variant"
            >
              <span>{{ $t('home.inside.datatableF') }}</span>
              <span class="shrink-0 font-bold text-brand-teal-deep dark:text-brand-mint">
                {{ $t('home.inside.datatableF2') }}
              </span>
            </div>
          </div>

          <!-- Reusable UI -->
          <div
            class="flex flex-col justify-between gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 transition-colors hover:bg-surface-container-high"
          >
            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue shadow-sm dark:bg-brand-mint/10 dark:text-brand-mint"
                >
                  <MaterialSymbol :name="inside[2]!.icon" :size="24" />
                </div>
                <span
                  class="rounded-full border border-outline-variant/30 bg-surface px-3 py-0.5 font-mono text-xs font-semibold text-brand-teal-deep dark:text-brand-mint"
                >
                  {{ inside[2]!.tag }}
                </span>
              </div>
              <h3 class="text-xl font-semibold text-on-surface">{{ inside[2]!.title }}</h3>
              <p class="text-sm text-on-surface-variant">{{ inside[2]!.text }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span
                v-for="pill in ($t('home.inside.uiPills') as string).split(' · ')"
                :key="pill"
                class="rounded-full border border-outline-variant/30 bg-surface px-2.5 py-0.5 text-xs text-on-surface-variant"
              >
                {{ pill }}
              </span>
            </div>
          </div>

          <!-- Shared contracts -->
          <div
            class="flex flex-col justify-between gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 transition-colors hover:bg-surface-container-high"
          >
            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-blue text-white shadow-sm"
                >
                  <MaterialSymbol :name="inside[3]!.icon" :size="24" />
                </div>
                <span
                  class="rounded-full border border-outline-variant/30 bg-surface px-3 py-0.5 font-mono text-xs font-semibold text-brand-teal-deep dark:text-brand-mint"
                >
                  {{ inside[3]!.tag }}
                </span>
              </div>
              <h3 class="text-xl font-semibold text-on-surface">{{ inside[3]!.title }}</h3>
              <p class="text-sm text-on-surface-variant">{{ inside[3]!.text }}</p>
            </div>
            <div
              class="flex min-w-0 items-center gap-1.5 rounded-2xl border border-outline-variant/30 bg-surface p-3 font-mono text-xs text-on-surface-variant"
            >
              <span class="shrink-0 font-semibold text-brand-blue dark:text-brand-mint"
                >import</span
              >
              <span class="truncate">{ UserRole, ApiResponse }</span>
              <span class="shrink-0 font-semibold text-brand-blue dark:text-brand-mint">from</span>
              <span class="truncate font-semibold text-brand-teal-deep dark:text-brand-mint">
                '@nuxion/shared-types'
              </span>
            </div>
          </div>

          <!-- Dev stack -->
          <div
            class="flex flex-col justify-between gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 transition-colors hover:bg-surface-container-high"
          >
            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-2xl border border-outline-variant/40 bg-surface-container-highest text-primary shadow-sm"
                >
                  <MaterialSymbol :name="inside[4]!.icon" :size="24" />
                </div>
                <span
                  class="rounded-full border border-outline-variant/30 bg-surface px-3 py-0.5 font-mono text-xs font-semibold text-on-surface-variant"
                >
                  {{ inside[4]!.tag }}
                </span>
              </div>
              <h3 class="text-xl font-semibold text-on-surface">{{ inside[4]!.title }}</h3>
              <p class="text-sm text-on-surface-variant">{{ inside[4]!.text }}</p>
            </div>
            <div class="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
              <span>{{ $t('home.inside.dockerF') }}</span>
              <span
                class="flex shrink-0 items-center gap-1 font-semibold text-brand-teal-deep dark:text-brand-mint"
              >
                <MaterialSymbol name="power" :size="16" />
                {{ $t('home.inside.dockerF2') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Why NestJS backend, not fullstack Nuxt ───────────────────── -->
    <section id="why" class="scroll-mt-20 py-16 lg:py-24">
      <div class="mx-auto flex max-w-7xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
        <div class="flex max-w-3xl flex-col gap-2">
          <div
            class="flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-brand-teal-deep dark:text-brand-mint"
          >
            <MaterialSymbol name="architecture" :size="18" />
            {{ $t('home.why.eyebrow') }}
          </div>
          <h2 class="text-3xl font-bold tracking-tight text-on-surface">
            {{ $t('home.why.title') }}
          </h2>
          <p class="leading-relaxed text-on-surface-variant">{{ $t('home.why.lead') }}</p>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <!-- Four reasons -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
            <div
              v-for="reason in whyReasons"
              :key="reason.title"
              class="flex flex-col gap-3 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 transition-colors hover:bg-surface-container-high"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl"
                :class="reason.tint"
              >
                <MaterialSymbol :name="reason.icon" :size="22" />
              </div>
              <h3 class="text-lg font-semibold text-on-surface">{{ reason.title }}</h3>
              <p class="text-sm leading-relaxed text-on-surface-variant">{{ reason.text }}</p>
            </div>
          </div>

          <!-- Side-by-side comparison card -->
          <div
            class="flex flex-col gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 lg:col-span-5 md:p-8"
          >
            <div class="flex flex-col gap-1">
              <h3 class="text-lg font-semibold text-on-surface">
                {{ $t('home.why.vsTitle') }}
              </h3>
            </div>
            <div class="flex flex-col divide-y divide-outline-variant">
              <div
                class="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 pb-3 text-xs font-semibold uppercase tracking-wide"
              >
                <span class="text-on-surface-variant" />
                <span class="w-28 text-center text-on-surface-variant sm:w-32">
                  {{ $t('home.why.vsNuxt') }}
                </span>
                <span class="w-28 text-center text-brand-teal-deep dark:text-brand-mint sm:w-32">
                  {{ $t('home.why.vsNest') }}
                </span>
              </div>
              <div
                v-for="row in whyRows"
                :key="row.label"
                class="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-3"
              >
                <span class="text-sm font-medium text-on-surface">{{ row.label }}</span>
                <span
                  class="flex w-28 items-center justify-center gap-1.5 text-center text-xs text-on-surface-variant sm:w-32"
                >
                  <MaterialSymbol name="close" :size="14" class="shrink-0 text-error" />
                  {{ row.nuxt }}
                </span>
                <span
                  class="flex w-28 items-center justify-center gap-1.5 text-center text-xs font-semibold text-on-surface sm:w-32"
                >
                  <MaterialSymbol
                    name="check"
                    :size="14"
                    class="shrink-0 text-brand-teal-deep dark:text-brand-mint"
                  />
                  {{ row.nest }}
                </span>
              </div>
            </div>
            <p class="text-xs leading-relaxed text-on-surface-variant">
              {{ $t('home.why.note') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Stack chips + code tabs ──────────────────────────────────── -->
    <section id="stack" class="scroll-mt-20 bg-surface-container-low py-16 lg:py-20">
      <div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div class="flex max-w-xl flex-col gap-1">
          <span
            class="font-mono text-xs font-medium uppercase tracking-wider text-brand-teal-deep dark:text-brand-mint"
          >
            {{ $t('home.stackEyebrow') }}
          </span>
          <h2 class="text-3xl font-bold tracking-tight text-on-surface">
            {{ $t('home.stackTitle') }}
          </h2>
          <p class="text-sm text-on-surface-variant">{{ $t('home.stackLead') }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span
            v-for="item in stack"
            :key="item"
            class="inline-flex cursor-default items-center gap-1.5 rounded-full border border-outline-variant/30 bg-surface px-4 py-1 text-sm font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container-high"
          >
            {{ item }}
          </span>
        </div>

        <div
          class="mt-2 overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface shadow-md"
        >
          <Tabs v-model="activeCodeTab" :tabs="codeTabs" class="gap-0">
            <template #tab-shared>
              <div class="flex flex-col gap-2 p-6">
                <p class="mb-1 text-sm text-on-surface-variant">
                  {{ $t('home.tabs.sharedLead') }}
                </p>
                <pre
                  class="overflow-x-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 font-mono text-[13px] leading-relaxed text-on-surface"
                ><code>packages/shared-types/src/
├─ enums/user-role.enum.ts      <span class="text-on-surface-variant">// UserRole</span>
├─ types/api-response.ts        <span class="text-on-surface-variant">// ApiResponse envelope</span>
├─ types/query.ts               <span class="text-on-surface-variant">// list query params</span>
└─ entities/index.ts            <span class="text-on-surface-variant">// SafeUserEntity (omits hash)</span></code></pre>
              </div>
            </template>
            <template #tab-env>
              <div class="flex flex-col gap-2 p-6">
                <p class="mb-1 text-sm text-on-surface-variant">
                  {{ $t('home.tabs.envLead') }}
                </p>
                <pre
                  class="overflow-x-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 font-mono text-[13px] leading-relaxed text-on-surface"
                ><code>NODE_ENV=development
DATABASE_URL=postgresql://user:pass@nuxion-postgres:5432/nuxion
REDIS_HOST=nuxion-redis
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
NUXT_PUBLIC_API_BASE=http://localhost:8000/api</code></pre>
              </div>
            </template>
            <template #tab-turbo>
              <div class="flex flex-col gap-2 p-6">
                <p class="mb-1 text-sm text-on-surface-variant">
                  {{ $t('home.tabs.turboLead') }}
                </p>
                <pre
                  class="overflow-x-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 font-mono text-[13px] leading-relaxed text-on-surface"
                ><code>{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".output/**"] },
    "dev":   { "cache": false, "persistent": true },
    "lint":  {},
    "typecheck": { "dependsOn": ["^build"] }
  }
}</code></pre>
              </div>
            </template>
          </Tabs>
        </div>
      </div>
    </section>

    <!-- ── CTA banner ───────────────────────────────────────────────── -->
    <section class="py-16 lg:py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          class="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl bg-brand-navy bg-gradient-to-br from-brand-navy via-brand-blue to-brand-teal p-8 text-white shadow-xl md:flex-row md:p-12"
        >
          <div class="z-10 flex max-w-xl flex-col gap-2">
            <span class="font-mono text-xs font-medium uppercase tracking-wider text-brand-mint">
              {{ $t('home.cta.eyebrow') }}
            </span>
            <h3 class="text-3xl font-bold tracking-tight">
              {{ $t('home.cta.title') }}
            </h3>
            <p class="text-sm opacity-90">{{ $t('home.cta.lead') }}</p>
          </div>
          <div class="z-10 flex shrink-0 flex-col items-center gap-3 sm:flex-row">
            <Button
              variant="secondary"
              size="lg"
              class="bg-white text-brand-navy hover:bg-brand-mint hover:text-brand-navy active:scale-[0.98]"
              @click="copy(CREATE_CMD)"
            >
              <MaterialSymbol name="content_copy" :size="18" />
              {{ $t('home.cta.copy') }}
            </Button>
            <a :href="`${REPO_URL}#readme`" target="_blank" rel="noopener" class="inline-flex">
              <Button
                variant="outline"
                size="lg"
                class="border-white/40 bg-brand-navy/40 text-white hover:bg-brand-navy/60 hover:text-white active:scale-[0.98]"
              >
                <MaterialSymbol name="menu_book" :size="18" />
                {{ $t('home.cta.docs') }}
              </Button>
            </a>
          </div>
          <div
            aria-hidden="true"
            class="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-brand-mint/15 blur-2xl"
          />
        </div>
      </div>
    </section>

    <!-- ── Footer ───────────────────────────────────────────────────── -->
    <footer class="border-t border-outline-variant/30 bg-surface-container-low py-10">
      <div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div class="flex items-center gap-3">
            <BrandLogo class="h-8" />
            <div>
              <p class="text-base font-semibold text-on-surface">{{ APP_NAME }}</p>
              <p class="text-xs text-on-surface-variant">{{ $t('home.footer.tagline') }}</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-5">
            <a
              :href="REPO_URL"
              target="_blank"
              rel="noopener"
              class="text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {{ $t('home.footer.repo') }}
            </a>
            <a
              :href="`${REPO_URL}/releases`"
              target="_blank"
              rel="noopener"
              class="text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {{ $t('home.footer.releases') }}
            </a>
            <a
              :href="`${REPO_URL}/blob/main/LICENSE`"
              target="_blank"
              rel="noopener"
              class="text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
            >
              MIT License
            </a>
          </div>
        </div>
        <div class="flex flex-col items-center justify-between gap-3 pt-2 md:flex-row">
          <p class="text-xs text-on-surface-variant">
            © {{ year }} {{ APP_NAME }} · {{ $t('home.footer.license') }}
          </p>
          <div class="flex items-center gap-2">
            <span
              v-for="pill in ['NestJS 12', 'Nuxt 4', 'Turborepo']"
              :key="pill"
              class="rounded-full bg-surface-container px-2.5 py-0.5 font-mono text-[11px] text-on-surface-variant"
            >
              {{ pill }}
            </span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
