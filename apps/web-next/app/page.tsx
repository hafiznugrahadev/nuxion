import { CopyButton } from '@/components/common/copy-button';
import { BrandLogo } from '@/components/common/brand-logo';
import { LanguageSwitcher } from '@/components/shell/language-switcher';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Blocks,
  BookOpen,
  Check,
  CircleCheck,
  Clock,
  Code,
  Copy,
  DraftingCompass,
  Network,
  KeyRound,
  Cpu,
  Package,
  Power,
  RefreshCw,
  Route,
  Shield,
  ShieldCheck,
  Table,
  Terminal,
  UserCog,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

/*
 * Public landing — full port of the Nuxt variant's index.vue design (Stitch
 * redraft on the MD3 token layer), with the copy adjusted to describe THIS
 * variant honestly: NestJS + Next headline, web:next on :8080 in the
 * terminal, the Next-variant stack chips, and the scaffolder command
 * including --frontend next. Every number shown is a repo fact. The hero
 * sign-in button and auth-aware nav return with the auth stage (/login does
 * not exist yet — a dead CTA is worse than none).
 */

// Keep in sync with the root package.json.
const KIT_VERSION = 'v0.1.0';
const REPO_URL = 'https://github.com/hafiznugrahadev/nuxion';
const CREATE_CMD = 'bun create nuxion@latest my-app --frontend next';

// Install commands: REAL, mirrored from README "Getting started". Only the
// step comments are localized; the commands are identical in every locale.
interface CloneStep {
  comment: string;
  lines: { cmd: string; rest: string; docker?: boolean }[];
}

// Terminal mockup: real ports and services of this variant, no invented
// telemetry.
const TERM_LOG = [
  { tag: 'web:next', text: 'ready on http://localhost:8080' },
  { tag: 'api:nest', text: 'ready on http://localhost:8000' },
  { tag: 'shared-types', text: 'built dist/ (ESM + CJS)' },
] as const;
const TERM_SERVICES = 'PostgreSQL 17 • Redis 7 • RustFS • Mailpit';

// Stack chips with the versions actually pinned in this variant.
const STACK = [
  'Bun 1.3',
  'Turborepo',
  'NestJS 12',
  'Next.js 16',
  'React 19',
  'Tailwind v4',
  'Material Design 3',
  'Drizzle ORM',
  'PostgreSQL 17',
  'Redis 7',
  'TanStack Query 5',
  'next-intl',
  'React Hook Form + Zod',
  'Docker Compose',
];

// Hero entrance: one staggered rise per element, expressed as CSS so it also
// plays without hydration (elements are never hidden by default).
const RISE =
  'animate-[hero-rise_600ms_cubic-bezier(0.2,0,0,1)_backwards] motion-reduce:animate-none';

export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('home.metaTitle', { app: t('app.name') }),
    description: t('home.metaDescription'),
  };
}

export default async function Home() {
  const t = await getTranslations();
  const appName = t('app.name');
  const year = new Date().getFullYear();

  const cloneSteps: CloneStep[] = [
    {
      comment: `# 1. ${t('home.install.steps.install')}`,
      lines: [{ cmd: 'bun', rest: ' install' }],
    },
    { comment: `# 2. ${t('home.install.steps.init')}`, lines: [{ cmd: 'bun', rest: ' run init' }] },
    {
      comment: `# 3. ${t('home.install.steps.services')}`,
      lines: [{ cmd: 'docker', rest: ' compose up -d postgres redis', docker: true }],
    },
    {
      comment: `# 4. ${t('home.install.steps.migrate')}`,
      lines: [
        { cmd: 'bun', rest: ' run --filter @nuxion/api db:migrate' },
        { cmd: 'bun', rest: ' run --filter @nuxion/api db:seed' },
      ],
    },
    {
      comment: `# 5. ${t('home.install.steps.serve')}`,
      lines: [{ cmd: 'bun', rest: ' run serve' }],
    },
  ];
  const cloneStepsPlain = cloneSteps
    .flatMap((step) => [step.comment, ...step.lines.map((line) => line.cmd + line.rest), ''])
    .join('\n')
    .trim();

  // "What's inside" bento — everything below exists in the repository right
  // now (the auth/datatable cards describe the kit's Nuxt side, which is why
  // the lead says "in this repository").
  const inside: Array<{ icon: LucideIcon; title: string; text: string; tag: string }> = [
    {
      icon: Shield,
      title: t('home.inside.authTitle'),
      text: t('home.inside.authText'),
      tag: t('home.inside.authTag'),
    },
    {
      icon: Table,
      title: t('home.inside.datatableTitle'),
      text: t('home.inside.datatableText'),
      tag: t('home.inside.datatableTag'),
    },
    {
      icon: Blocks,
      title: t('home.inside.uiTitle'),
      text: t('home.inside.uiText'),
      tag: t('home.inside.uiTag'),
    },
    {
      icon: ArrowLeftRight,
      title: t('home.inside.sharedTitle'),
      text: t('home.inside.sharedText'),
      tag: t('home.inside.sharedTag'),
    },
    {
      icon: Package,
      title: t('home.inside.dockerTitle'),
      text: t('home.inside.dockerText'),
      tag: t('home.inside.dockerTag'),
    },
  ];

  const whyReasons = [
    {
      icon: Network,
      tint: 'bg-brand-navy text-white dark:bg-brand-mint/15 dark:text-brand-mint',
      title: t('home.why.c1t'),
      text: t('home.why.c1x'),
    },
    {
      icon: ShieldCheck,
      tint: 'bg-brand-teal/15 text-brand-teal-deep dark:bg-brand-teal/20 dark:text-brand-mint',
      title: t('home.why.c2t'),
      text: t('home.why.c2x'),
    },
    {
      icon: Clock,
      tint: 'bg-brand-blue/10 text-brand-blue dark:bg-brand-mint/10 dark:text-brand-mint',
      title: t('home.why.c3t'),
      text: t('home.why.c3x'),
    },
    {
      icon: Route,
      tint: 'bg-gradient-to-br from-brand-navy to-brand-blue text-white',
      title: t('home.why.c4t'),
      text: t('home.why.c4x'),
    },
  ];
  const whyRows = [1, 2, 3, 4].map((i) => ({
    label: t(`home.why.r${i}l`),
    con: t(`home.why.r${i}n`),
    nest: t(`home.why.r${i}s`),
  }));

  const uiPills = t('home.inside.uiPills').split(' · ');

  const codePanels = {
    shared: (
      <div className="flex flex-col gap-2 p-6">
        <p className="mb-1 text-sm text-on-surface-variant">{t('home.tabs.sharedLead')}</p>
        <pre className="overflow-x-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 font-mono text-[13px] leading-relaxed text-on-surface">
          <code>
            {'packages/shared-types/src/\n├─ enums/user-role.enum.ts      '}
            <span className="text-on-surface-variant">{'// UserRole'}</span>
            {'\n├─ types/api-response.ts        '}
            <span className="text-on-surface-variant">{'// ApiResponse envelope'}</span>
            {'\n├─ types/query.ts               '}
            <span className="text-on-surface-variant">{'// list query params'}</span>
            {'\n└─ entities/index.ts            '}
            <span className="text-on-surface-variant">{'// SafeUserEntity (omits hash)'}</span>
          </code>
        </pre>
      </div>
    ),
    env: (
      <div className="flex flex-col gap-2 p-6">
        <p className="mb-1 text-sm text-on-surface-variant">{t('home.tabs.envLead')}</p>
        <pre className="overflow-x-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 font-mono text-[13px] leading-relaxed text-on-surface">
          <code>
            {
              'APP_URL=https://app.example.com\nDATABASE_URL=postgresql://user:pass@nuxion-db:5432/nuxion\nREDIS_URL=redis://nuxion-redis:6379\nJWT_SECRET=change-me-min-16-chars'
            }
          </code>
        </pre>
      </div>
    ),
    turbo: (
      <div className="flex flex-col gap-2 p-6">
        <p className="mb-1 text-sm text-on-surface-variant">{t('home.tabs.turboLead')}</p>
        <pre className="overflow-x-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 font-mono text-[13px] leading-relaxed text-on-surface">
          <code>
            {
              '{\n  "$schema": "https://turbo.build/schema.json",\n  "globalDependencies": [".env"],\n  "tasks": {\n    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".output/**", ".next/**"] },\n    "dev":   { "cache": false, "persistent": true },\n    "lint":  {},\n    "typecheck": { "dependsOn": ["^build"] }\n  }\n}'
            }
          </code>
        </pre>
      </div>
    ),
  };

  const tagChipClass =
    'rounded-full border border-outline-variant/30 bg-surface px-3 py-0.5 font-mono text-xs font-semibold text-brand-teal-deep dark:text-brand-mint';
  const cardClass =
    'flex flex-col justify-between gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 transition-colors hover:bg-surface-container-high';

  const [authCard, datatableCard, uiCard, sharedCard, devCard] = inside;

  return (
    <div className="flex min-h-svh flex-col bg-background text-on-surface">
      {/* Fixed top bar (MD3): surface + blur, brand tile, anchor nav pills. */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/40 bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <BrandLogo className="h-8" />
            <div className="flex flex-col leading-none">
              <span className="text-base font-semibold tracking-tight text-on-surface">
                {appName}
              </span>
              <span className="mt-1 font-mono text-[11px] text-on-surface-variant">
                NestJS + Next Monorepo
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label={t('nav.menu')}>
            {(
              [
                ['features', 'home.nav.features'],
                ['quickstart', 'home.nav.quickstart'],
                ['why', 'home.nav.why'],
                ['stack', 'home.nav.stack'],
              ] as const
            ).map(([anchor, key]) => (
              <a
                key={anchor}
                href={`#${anchor}`}
                className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                {t(key)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Animated ambience: blueprint grid panning under a radial mask … */}
          <div aria-hidden="true" className="hero-grid-mask pointer-events-none absolute inset-0">
            <div className="hero-grid" />
          </div>
          {/* … tonal blobs drifting behind the content … */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-16 h-96 w-96 transform-gpu animate-[hero-drift-a_22s_ease-in-out_infinite] rounded-full bg-primary/10 blur-3xl motion-reduce:animate-none" />
            <div className="absolute -right-28 top-40 h-[26rem] w-[26rem] transform-gpu animate-[hero-drift-b_28s_ease-in-out_infinite] rounded-full bg-secondary-container/50 blur-3xl motion-reduce:animate-none" />
            <div className="absolute left-1/3 -top-10 h-[30rem] w-[26rem] transform-gpu animate-[hero-drift-a_26s_ease-in-out_infinite_reverse] rounded-full bg-tertiary-container/30 blur-3xl motion-reduce:animate-none" />
          </div>
          {/* … and a soft light sweep. All decorative: no pointer events,
               frozen under prefers-reduced-motion. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-y-[-20%] left-0 w-40 transform-gpu animate-[hero-sweep_10s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent blur-xl motion-reduce:animate-none" />
          </div>
          {/* Diagonal cut into the quickstart section (fills its exact bg token). */}
          <svg
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-20 w-full md:h-28"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polygon points="0,100 100,0 100,100" className="fill-surface-container-low" />
          </svg>

          <div className="relative mx-auto max-w-7xl px-4 pb-32 pt-14 sm:px-6 md:pb-40 md:pt-20">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
              {/* Left: pitch */}
              <div className="flex min-w-0 flex-col items-start gap-6 lg:col-span-7">
                <div
                  className={`inline-flex cursor-default items-center gap-1.5 rounded-full bg-secondary-container px-4 py-0.5 text-xs font-medium text-on-secondary-container shadow-sm ${RISE}`}
                >
                  <BrandLogo className="h-4" />
                  <span>{appName}</span>
                  <span
                    className="mx-1 h-1.5 w-1.5 rounded-full bg-brand-teal"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {KIT_VERSION}
                  </span>
                </div>

                <h1
                  className={`text-4xl font-bold leading-[1.08] tracking-tight text-on-surface sm:text-5xl lg:text-[56px] ${RISE} [animation-delay:80ms]`}
                >
                  NestJS + Next
                  <br className="hidden sm:inline" />{' '}
                  <span className="bg-gradient-to-r from-brand-navy via-brand-blue to-brand-teal bg-clip-text text-transparent dark:from-brand-mint dark:via-brand-teal dark:to-brand-mint">
                    {appName}
                  </span>
                </h1>

                <p
                  className={`max-w-2xl leading-relaxed text-on-surface-variant ${RISE} [animation-delay:160ms]`}
                >
                  {t('home.description')}
                </p>

                <div
                  className={`flex w-full flex-wrap items-center gap-3 pt-1 sm:w-auto ${RISE} [animation-delay:240ms]`}
                >
                  <CopyButton
                    text={CREATE_CMD}
                    size="lg"
                    className="bg-brand-teal-deep text-white hover:bg-brand-navy active:scale-[0.98]"
                  >
                    <Terminal size={18} aria-hidden="true" />
                    {t('home.installCta')}
                    <ArrowRight size={18} className="ml-1 opacity-80" aria-hidden="true" />
                  </CopyButton>
                </div>

                {/* Micro spec pills: repo facts only */}
                <div
                  className={`flex flex-wrap items-center gap-3 pt-2 text-xs font-medium text-on-surface-variant ${RISE} [animation-delay:320ms]`}
                >
                  {(['access', 'roles', 'docker'] as const).map((key) => (
                    <span key={key} className="flex items-center gap-1">
                      <CircleCheck
                        size={16}
                        className="text-brand-teal-deep dark:text-brand-mint"
                        aria-hidden="true"
                      />
                      {t(`home.pills.${key}`)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: terminal mockup (always dark, token-based accents). */}
              <div className={`min-w-0 w-full lg:col-span-5 ${RISE} [animation-delay:320ms]`}>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-inverse-surface text-inverse-on-surface shadow-xl dark:bg-surface-container-lowest dark:text-on-surface">
                  <div className="flex items-center justify-between border-b border-white/10 bg-black/25 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-error" aria-hidden="true" />
                      <span className="h-3 w-3 rounded-full bg-warning" aria-hidden="true" />
                      <span
                        className="h-3 w-3 rounded-full bg-primary-container dark:bg-brand-mint"
                        aria-hidden="true"
                      />
                      <span className="ml-2 font-mono text-[11px] text-white/70">
                        {' '}
                        turbo — parallel{' '}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-white/70">
                      <span
                        className="h-2 w-2 animate-pulse rounded-full bg-primary-container dark:bg-brand-mint"
                        aria-hidden="true"
                      />
                      dev:ready
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 p-4 font-mono text-xs leading-relaxed">
                    <div className="text-white/60">{'// bun run serve'}</div>
                    {TERM_LOG.map((line) => (
                      <div key={line.tag} className="flex items-start gap-2">
                        <span className="font-bold text-primary-container dark:text-brand-mint">
                          [{line.tag}]
                        </span>
                        <span>{line.text}</span>
                      </div>
                    ))}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <Cpu
                        size={16}
                        className="text-primary-container dark:text-brand-mint"
                        aria-hidden="true"
                      />
                      <span className="opacity-80">{TERM_SERVICES}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-primary-container dark:text-brand-mint">$</span>
                      <span>bun run test</span>
                      <span className="font-semibold text-primary-container dark:text-brand-mint">
                        PASS
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 bg-black/25 px-4 py-2">
                    <span className="font-mono text-[11px] opacity-70"> bun create nuxion </span>
                    <CopyButton
                      text={CREATE_CMD}
                      variant="ghost"
                      size="sm"
                      className="touch-target relative gap-1 rounded-none px-0 font-mono text-[11px] text-primary-container hover:bg-transparent dark:text-brand-mint"
                    >
                      <Copy size={14} aria-hidden="true" />
                      {t('home.term.copyScaffold')}
                    </CopyButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Quickstart: scaffolder + manual bootstrap ────────────────── */}
        <section id="quickstart" className="scroll-mt-20 bg-surface-container-low py-16 lg:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
            <div className="flex max-w-3xl flex-col gap-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-brand-teal-deep dark:text-brand-mint">
                <Terminal size={18} aria-hidden="true" />
                {t('home.install.eyebrow')}
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-on-surface">
                {t('home.install.title')}
              </h2>
              <p className="leading-relaxed text-on-surface-variant">{t('home.install.lead')}</p>
            </div>

            {/* Scaffolder one-liner */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-outline-variant/40 bg-surface p-4 shadow-sm sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                  <Zap size={20} aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs text-on-surface-variant">
                    {t('home.install.scaffolderLabel')}
                  </span>
                  <code className="truncate font-mono text-sm text-on-surface">{CREATE_CMD}</code>
                  <span className="text-xs text-on-surface-variant">
                    {t('home.install.variantNote')}
                  </span>
                </div>
              </div>
              <CopyButton text={CREATE_CMD} variant="outline" size="sm" className="shrink-0">
                <Copy size={16} aria-hidden="true" />
                {t('home.copy')}
              </CopyButton>
            </div>

            {/* Manual bootstrap */}
            <div className="flex flex-col gap-8 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 md:p-8 lg:flex-row">
              <div className="flex flex-col justify-between gap-6 lg:w-5/12">
                <div className="flex flex-col gap-4">
                  <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary-container px-3 py-0.5 font-mono text-xs text-on-secondary-container">
                    <Route
                      size={16}
                      className="text-brand-teal-deep dark:text-brand-mint"
                      aria-hidden="true"
                    />
                    {t('home.install.manualChip')}
                  </div>
                  <h3 className="text-2xl font-semibold text-on-surface">
                    {t('home.install.cloneTitle')}
                  </h3>
                  <p className="text-sm text-on-surface-variant">{t('home.install.cloneLead')}</p>
                  <ul className="flex flex-col gap-2 pt-1 text-sm text-on-surface">
                    {(['workspaces', 'env', 'seed'] as const).map((key) => (
                      <li key={key} className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-container">
                          <Check
                            size={14}
                            className="text-brand-teal-deep dark:text-brand-mint"
                            aria-hidden="true"
                          />
                        </span>
                        {t(`home.install.checks.${key}`)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
                  <BadgeCheck
                    size={28}
                    className="text-brand-teal-deep dark:text-brand-mint"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-on-surface">
                      {t('home.install.zeroDriftTitle')}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {t('home.install.zeroDriftText')}
                    </span>
                  </div>
                </div>
              </div>

              {/* manual-setup.sh terminal */}
              <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-inverse-surface text-inverse-on-surface shadow-md dark:bg-surface-container-lowest dark:text-on-surface lg:w-7/12">
                <div className="flex items-center justify-between border-b border-white/10 bg-black/25 px-4 py-2">
                  <span className="flex items-center gap-1.5 font-mono text-xs font-semibold opacity-70">
                    <Code
                      size={16}
                      className="text-primary-container dark:text-brand-mint"
                      aria-hidden="true"
                    />
                    manual-setup.sh
                  </span>
                  <CopyButton
                    text={cloneStepsPlain}
                    variant="ghost"
                    size="sm"
                    className="touch-target relative gap-1 rounded-none px-0 font-mono text-xs text-primary-container hover:bg-transparent dark:text-brand-mint"
                  >
                    <Copy size={14} aria-hidden="true" />
                    {t('home.install.copyAll')}
                  </CopyButton>
                </div>
                <div className="flex flex-col gap-4 overflow-x-auto p-4 font-mono text-[13px] leading-[22px]">
                  {cloneSteps.map((step, index) => (
                    <div
                      key={step.comment}
                      className={index === 4 ? 'mt-1 border-t border-white/10 pt-3' : undefined}
                    >
                      <span className="block select-none text-white/60">{step.comment}</span>
                      {step.lines.map((line) => (
                        <div key={line.rest}>
                          <span
                            className={`font-bold ${line.docker ? 'text-brand-mint' : 'text-primary-container dark:text-brand-mint'}`}
                          >
                            {line.cmd}{' '}
                          </span>
                          {line.rest}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── What's inside (bento) ────────────────────────────────────── */}
        <section id="features" className="scroll-mt-20 py-16 lg:py-24">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="flex max-w-2xl flex-col gap-1">
                <span className="font-mono text-xs font-medium uppercase tracking-wider text-brand-teal-deep dark:text-brand-mint">
                  {t('home.inside.eyebrow')}
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-on-surface">
                  {t('home.inside.title')}
                </h2>
                <p className="leading-relaxed text-on-surface-variant">{t('home.inside.lead')}</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-teal" aria-hidden="true" />
                {t('home.inside.typed')}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Auth & RBAC: wide card */}
              <div className={`${cardClass} md:col-span-2`}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-navy text-white shadow-sm dark:bg-brand-mint/15 dark:text-brand-mint">
                      <authCard.icon size={24} aria-hidden="true" />
                    </div>
                    <span className={tagChipClass}>{authCard.tag}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-on-surface">{authCard.title}</h3>
                  <p className="max-w-xl text-sm text-on-surface-variant">{authCard.text}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-outline-variant/30 bg-surface p-4 font-mono text-xs text-on-surface">
                  <span className="flex items-center gap-1.5">
                    <KeyRound
                      size={16}
                      className="text-brand-teal-deep dark:text-brand-mint"
                      aria-hidden="true"
                    />
                    {t('home.inside.authF1')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <RefreshCw
                      size={16}
                      className="text-brand-teal-deep dark:text-brand-mint"
                      aria-hidden="true"
                    />
                    {t('home.inside.authF2')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UserCog
                      size={16}
                      className="text-brand-teal-deep dark:text-brand-mint"
                      aria-hidden="true"
                    />
                    {t('home.inside.authF3')}
                  </span>
                </div>
              </div>

              {/* Users datatable */}
              <div className={cardClass}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal/15 text-brand-teal-deep shadow-sm dark:bg-brand-teal/20 dark:text-brand-mint">
                      <datatableCard.icon size={24} aria-hidden="true" />
                    </div>
                    <span className={tagChipClass}>{datatableCard.tag}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-on-surface">{datatableCard.title}</h3>
                  <p className="text-sm text-on-surface-variant">{datatableCard.text}</p>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-outline-variant/30 bg-surface p-3 text-xs text-on-surface-variant">
                  <span>{t('home.inside.datatableF')}</span>
                  <span className="shrink-0 font-bold text-brand-teal-deep dark:text-brand-mint">
                    {t('home.inside.datatableF2')}
                  </span>
                </div>
              </div>

              {/* Reusable UI */}
              <div className={cardClass}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue shadow-sm dark:bg-brand-mint/10 dark:text-brand-mint">
                      <uiCard.icon size={24} aria-hidden="true" />
                    </div>
                    <span className={tagChipClass}>{uiCard.tag}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-on-surface">{uiCard.title}</h3>
                  <p className="text-sm text-on-surface-variant">{uiCard.text}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {uiPills.map((pill) => (
                    <span
                      key={pill}
                      className="rounded-full border border-outline-variant/30 bg-surface px-2.5 py-0.5 text-xs text-on-surface-variant"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Shared contracts */}
              <div className={cardClass}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-blue text-white shadow-sm">
                      <sharedCard.icon size={24} aria-hidden="true" />
                    </div>
                    <span className={tagChipClass}>{sharedCard.tag}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-on-surface">{sharedCard.title}</h3>
                  <p className="text-sm text-on-surface-variant">{sharedCard.text}</p>
                </div>
                <div className="flex min-w-0 items-center gap-1.5 rounded-2xl border border-outline-variant/30 bg-surface p-3 font-mono text-xs text-on-surface-variant">
                  <span className="shrink-0 font-semibold text-brand-blue dark:text-brand-mint">
                    import
                  </span>
                  <span className="truncate">{`{ UserRole, ApiResponse }`}</span>
                  <span className="shrink-0 font-semibold text-brand-blue dark:text-brand-mint">
                    from
                  </span>
                  <span className="truncate font-semibold text-brand-teal-deep dark:text-brand-mint">
                    {"'@nuxion/shared-types'"}
                  </span>
                </div>
              </div>

              {/* Dev stack */}
              <div className={cardClass}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-outline-variant/40 bg-surface-container-highest text-primary shadow-sm">
                      <devCard.icon size={24} aria-hidden="true" />
                    </div>
                    <span className="rounded-full border border-outline-variant/30 bg-surface px-3 py-0.5 font-mono text-xs font-semibold text-on-surface-variant">
                      {devCard.tag}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-on-surface">{devCard.title}</h3>
                  <p className="text-sm text-on-surface-variant">{devCard.text}</p>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
                  <span>{t('home.inside.dockerF')}</span>
                  <span className="flex shrink-0 items-center gap-1 font-semibold text-brand-teal-deep dark:text-brand-mint">
                    <Power size={16} aria-hidden="true" />
                    {t('home.inside.dockerF2')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Why a NestJS backend, not fullstack Next ─────────────────── */}
        <section id="why" className="scroll-mt-20 py-16 lg:py-24">
          <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
            <div className="flex max-w-3xl flex-col gap-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-brand-teal-deep dark:text-brand-mint">
                <DraftingCompass size={18} aria-hidden="true" />
                {t('home.why.eyebrow')}
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-on-surface">
                {t('home.why.title')}
              </h2>
              <p className="leading-relaxed text-on-surface-variant">{t('home.why.lead')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Four reasons */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
                {whyReasons.map((reason) => (
                  <div
                    key={reason.title}
                    className="flex flex-col gap-3 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 transition-colors hover:bg-surface-container-high"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${reason.tint}`}
                    >
                      <reason.icon size={22} aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-on-surface">{reason.title}</h3>
                    <p className="text-sm leading-relaxed text-on-surface-variant">{reason.text}</p>
                  </div>
                ))}
              </div>

              {/* Side-by-side comparison card */}
              <div className="flex flex-col gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container p-6 md:p-8 lg:col-span-5">
                <h3 className="text-lg font-semibold text-on-surface">{t('home.why.vsTitle')}</h3>
                <div className="flex flex-col divide-y divide-outline-variant">
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 pb-3 text-xs font-semibold uppercase tracking-wide">
                    <span className="text-on-surface-variant" />
                    <span className="w-28 text-center text-on-surface-variant sm:w-32">
                      {t('home.why.vsNuxt')}
                    </span>
                    <span className="w-28 text-center text-brand-teal-deep dark:text-brand-mint sm:w-32">
                      {t('home.why.vsNest')}
                    </span>
                  </div>
                  {whyRows.map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-3"
                    >
                      <span className="text-sm font-medium text-on-surface">{row.label}</span>
                      <span className="flex w-28 items-center justify-center gap-1.5 text-center text-xs text-on-surface-variant sm:w-32">
                        <X size={14} className="shrink-0 text-error" aria-hidden="true" />
                        {row.con}
                      </span>
                      <span className="flex w-28 items-center justify-center gap-1.5 text-center text-xs font-semibold text-on-surface sm:w-32">
                        <Check
                          size={14}
                          className="shrink-0 text-brand-teal-deep dark:text-brand-mint"
                          aria-hidden="true"
                        />
                        {row.nest}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-on-surface-variant">
                  {t('home.why.note')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stack chips + code tabs ──────────────────────────────────── */}
        <section id="stack" className="scroll-mt-20 bg-surface-container-low py-16 lg:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
            <div className="flex max-w-xl flex-col gap-1">
              <span className="font-mono text-xs font-medium uppercase tracking-wider text-brand-teal-deep dark:text-brand-mint">
                {t('home.stackEyebrow')}
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-on-surface">
                {t('home.stackTitle')}
              </h2>
              <p className="text-sm text-on-surface-variant">{t('home.stackLead')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {STACK.map((item) => (
                <span
                  key={item}
                  className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-outline-variant/30 bg-surface px-4 py-1 text-sm font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container-high"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-2 overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface shadow-md">
              <Tabs
                className="gap-0"
                tabs={[
                  { value: 'shared', label: 'shared-types' },
                  { value: 'env', label: '.env' },
                  { value: 'turbo', label: 'turbo.json' },
                ]}
                panels={codePanels}
              />
            </div>
          </div>
        </section>

        {/* ── CTA banner ───────────────────────────────────────────────── */}
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-brand-blue to-brand-teal p-8 text-white shadow-xl md:flex-row md:p-12">
              <div className="z-10 flex max-w-xl flex-col gap-2">
                <span className="font-mono text-xs font-medium uppercase tracking-wider text-brand-mint">
                  {t('home.cta.eyebrow')}
                </span>
                <h3 className="text-3xl font-bold tracking-tight">{t('home.cta.title')}</h3>
                <p className="text-sm opacity-90">{t('home.cta.lead')}</p>
              </div>
              <div className="z-10 flex shrink-0 flex-col items-center gap-3 sm:flex-row">
                <CopyButton
                  text={CREATE_CMD}
                  variant="secondary"
                  size="lg"
                  className="bg-white text-brand-navy hover:bg-brand-mint hover:text-brand-navy active:scale-[0.98]"
                >
                  <Copy size={18} aria-hidden="true" />
                  {t('home.cta.copy')}
                </CopyButton>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="border-white/40 bg-brand-navy/40 text-white hover:bg-brand-navy/60 hover:text-white active:scale-[0.98]"
                >
                  <a href={`${REPO_URL}#readme`} target="_blank" rel="noopener">
                    <BookOpen size={18} aria-hidden="true" />
                    {t('home.cta.docs')}
                  </a>
                </Button>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-brand-mint/15 blur-2xl"
              />
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-outline-variant/30 bg-surface-container-low py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-8" />
              <div>
                <p className="text-base font-semibold text-on-surface">{appName}</p>
                <p className="text-xs text-on-surface-variant">{t('home.footer.tagline')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener"
                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {t('home.footer.repo')}
              </a>
              <a
                href={`${REPO_URL}/releases`}
                target="_blank"
                rel="noopener"
                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {t('home.footer.releases')}
              </a>
              <a
                href={`${REPO_URL}/blob/main/LICENSE`}
                target="_blank"
                rel="noopener"
                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
              >
                MIT License
              </a>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 pt-2 md:flex-row">
            <p className="text-xs text-on-surface-variant">
              © {year} {appName} · {t('home.footer.license')}
            </p>
            <div className="flex items-center gap-2">
              {['NestJS 12', 'Next.js 16', 'Turborepo'].map((pill) => (
                <span
                  key={pill}
                  className="rounded-full bg-surface-container px-2.5 py-0.5 font-mono text-[11px] text-on-surface-variant"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
