import tailwindcss from '@tailwindcss/vite';

// Derive the dev HMR transport from the public APP_URL. Behind OrbStack's HTTPS
// proxy (e.g. https://web.nuxion-dev.orb.local) the browser loads the app on
// port 443, but Vite can't infer where to open the HMR WebSocket and falls back
// to the container port (localhost:5173) — which the browser can't reach, so HMR
// silently dies and edits need a manual refresh. Pointing the client at wss://
// <host>:443 routes the socket back through the same proxy to the dev server.
// Plain localhost dev keeps APP_URL=http://localhost:… and needs no override
// (native ws on the dev port already works).
function resolveAppUrl() {
  const raw = process.env.APP_URL;
  if (!raw) return undefined;
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
}
const appUrl = resolveAppUrl();

function resolveDevHmr() {
  if (!appUrl || appUrl.protocol !== 'https:') return undefined;
  return {
    protocol: 'wss' as const,
    host: appUrl.hostname,
    clientPort: appUrl.port ? Number(appUrl.port) : 443,
  };
}
const devHmr = resolveDevHmr();

// Vite refuses requests whose Host header it doesn't recognise (DNS-rebinding
// guard). Behind the same OrbStack proxy the browser sends the proxy hostname —
// e.g. web.nuxion-dev.orb.local — which Vite cannot infer from its own
// listen address, so the request is rejected with "This host is not allowed"
// before the app ever renders. Allow exactly the APP_URL host, reusing the
// single source of truth above so the two can never drift apart. Plain
// localhost dev needs no entry (Vite already trusts localhost).
const devAllowedHosts = appUrl && appUrl.hostname !== 'localhost' ? [appUrl.hostname] : undefined;

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // Dev server port comes from the single root .env (WEB_PORT). In containers/prod
  // the process `PORT` (set by compose) wins.
  devServer: {
    host: process.env.HOST || 'localhost',
    port: Number(process.env.PORT || process.env.WEB_PORT) || 4300,
  },

  // Nuxt 4: srcDir defaults to app/ (alias ~ → app/), matching the spec structure.
  modules: ['@pinia/nuxt', '@nuxt/eslint', '@nuxtjs/i18n'],

  // vue-sonner's Nuxt module doesn't yet declare Nuxt 4 compat, so we register
  // <Toaster> manually in app.vue and just transpile the package for SSR.
  build: { transpile: ['vue-sonner'] },

  app: {
    head: {
      // MD3 tokens resolve under [data-theme]; setting it on the SSR'd <html>
      // means the scheme is defined on the very first paint, and the script
      // below only ever flips theme to dark.
      htmlAttrs: {
        'data-theme': 'light',
      },
      // Type system: Google Sans (UI) + Poppins (headings, see the heading
      // rule in main.css) + Material Symbols Outlined for icons. The icon
      // font uses display=block so ligature names never flash as raw text
      // while the font loads.
      // Favicon: PNG because Safari ignores WebP icons; both are square
      // center-crops generated from public/images/nuxion.webp.
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Google+Sans:wght@300;400;500;600;700;800&family=Poppins:wght@500;600;700;800&display=swap',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block',
        },
      ],
      script: [
        {
          // Anti-FOUC: resolve the appearance mode (light | dark | system)
          // before first paint so the scheme never flashes on reload. Mirrors
          // useTheme.ts: reads the persisted 'theme-mode' (legacy 'theme'
          // resolved values are migrated), system falls back to
          // prefers-color-scheme. Keeps data-theme (the MD3 scheme selector)
          // and .dark (legacy utilities) in lockstep — see useTheme.ts.
          innerHTML:
            "(function(){try{var m=localStorage.getItem('theme-mode');if(m!=='light'&&m!=='dark'&&m!=='system'){var l=localStorage.getItem('theme');m=(l==='dark'||l==='light')?l:'system';}var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.setAttribute('data-theme',d?'dark':'light');r.classList.toggle('dark',d);}catch(e){}})();",
          tagPosition: 'head',
        },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  /*
   * The /admin area renders client-side (SPA island): its session lives in
   * browser memory (restored from the refresh cookie by plugins/auth.client.ts)
   * and every admin data call runs in the browser, so server-rendering those
   * shells adds nothing — unauthenticated visitors get bounced to /login right
   * after hydration anyway. Public + auth pages stay SSR.
   */
  routeRules: {
    '/admin': { ssr: false },
    '/admin/**': { ssr: false },
  },

  vite: {
    plugins: [
      tailwindcss(),
      // Pinia statically imports `setupDevtoolsPlugin` from `@vue/devtools-api`,
      // which ships only a bare CJS `main` (no `exports` map). Under Bun's `.bun`
      // layout Vite serves that CommonJS file raw to the browser, which throws
      // `exports is not defined`. Redirect the import to the package's ESM build
      // — but ONLY for the client (`!options.ssr`). The SSR build resolves CJS
      // natively in Node; swapping it there corrupts pinia's payload
      // serialization. A plugin `resolveId` is the one place Vite reliably tells
      // us client-vs-server (Nuxt's `vite:extendConfig` shares one config and
      // leaks the change into SSR).
      {
        name: 'nuxion:devtools-api-client-esm',
        enforce: 'pre',
        async resolveId(source, importer, options) {
          if (source !== '@vue/devtools-api' || options.ssr || !importer) return null;
          const esm = await this.resolve('@vue/devtools-api/lib/esm/index.js', importer, {
            skipSelf: true,
          });
          return esm?.id ?? null;
        },
      },
    ],
    // Bundle these (instead of externalizing) so named ESM exports survive the
    // dev SSR transform under Bun — otherwise `import { z } from 'zod'` is
    // undefined server-side. Prod (Nitro) already inlines them.
    ssr: {
      noExternal: ['zod', '@vee-validate/zod', 'vee-validate'],
    },
    // In Docker on macOS/Windows, bind-mount file events don't reach the container,
    // so HMR needs polling to detect edits. Enabled only when NUXT_DEV_POLLING=true
    // (set by the dev compose) — local dev keeps native, CPU-friendly watching.
    // `hmr` is set only behind the OrbStack HTTPS proxy (see resolveDevHmr above);
    // it routes the HMR WebSocket back through wss://<host>:443 to the dev server.
    server: {
      ...(process.env.NUXT_DEV_POLLING === 'true'
        ? { watch: { usePolling: true, interval: 300 } }
        : {}),
      ...(devHmr ? { hmr: devHmr } : {}),
      ...(devAllowedHosts ? { allowedHosts: devAllowedHosts } : {}),
    },
  },

  // ── SPEC: Auto-import boundary strategy ──────────────────────────────────────
  // ON for shared layers; features/ is intentionally NOT registered so the
  // dependency rule is enforced via explicit barrel imports.
  components: [
    { path: '~/components/ui', pathPrefix: false },
    { path: '~/components/common', pathPrefix: false },
    { path: '~/components/blocks', pathPrefix: false },
    { path: '~/components/shell', pathPrefix: false },
    // features/ → not registered (explicit import via features/<x>/index.ts)
  ],

  imports: {
    dirs: ['composables', 'utils', 'stores'],
    // 'features' & 'lib' intentionally excluded — explicit imports only.
  },

  runtimeConfig: {
    // server-only secrets go here
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:4400/api',
      // Mirror the API's AUTH_REGISTRATION_ENABLED so the UI can show/hide sign-up.
      registrationEnabled: process.env.NUXT_PUBLIC_REGISTRATION_ENABLED === 'true',
    },
  },

  // ── i18n (English default + Indonesian) ─────────────────────────────────────
  // `no_prefix`: locale is kept in a cookie, URLs are unchanged (routes/middleware
  // /E2E stay intact). Locale files lazy-load from i18n/locales/.
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', language: 'en-US', file: 'en.json' },
      { code: 'id', name: 'Bahasa Indonesia', language: 'id-ID', file: 'id.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root',
    },
  },

  typescript: {
    strict: true,
  },
});
