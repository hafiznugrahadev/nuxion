/**
 * Appearance mode: 'system' | 'light' | 'dark'.
 *
 * The MD3 scheme resolves under [data-theme='light'|'dark'] on <html>, so the
 * RESOLVED theme always lives in that attribute; `mode` is what the user
 * picked. 'system' follows the OS `prefers-color-scheme` and reacts live to
 * OS theme changes while the app is open. The legacy `.dark` class is kept in
 * sync because `dark:` utilities and any third-party CSS may still key off it
 * (the `dark` custom variant in main.css matches either).
 *
 * The attribute is applied pre-paint by an inline script in nuxt.config
 * (anti-FOUC, same mode resolution incl. the legacy 'theme' key); this
 * composable keeps a reactive mirror and persists the chosen mode.
 */
export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const MODE_KEY = 'theme-mode';
const CYCLE: ThemeMode[] = ['light', 'dark', 'system'];

export function useTheme() {
  // SSR-safe shared state. Defaults: follow the system; resolved light until
  // the client reconciles on mount (anti-FOUC already corrected the DOM).
  const mode = useState<ThemeMode>('theme-mode', () => 'system');
  const theme = useState<ResolvedTheme>('theme', () => 'light');

  const isDark = computed(() => theme.value === 'dark');

  function systemPrefersDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function resolve(m: ThemeMode): ResolvedTheme {
    if (m !== 'system') return m;
    return systemPrefersDark() ? 'dark' : 'light';
  }

  function applyResolved(next: ResolvedTheme) {
    theme.value = next;
    const root = document.documentElement;
    root.setAttribute('data-theme', next);
    root.classList.toggle('dark', next === 'dark');
  }

  function setMode(next: ThemeMode) {
    mode.value = next;
    localStorage.setItem(MODE_KEY, next);
    applyResolved(resolve(next));
  }

  /** Cycles light → dark → system (the icon shows the CURRENT mode). */
  function toggle() {
    const idx = CYCLE.indexOf(mode.value);
    setMode(CYCLE[(idx + 1) % CYCLE.length] ?? 'system');
  }

  if (import.meta.client) {
    onMounted(() => {
      // Reconcile the chosen mode from storage (migrating the legacy resolved
      // 'theme' key), then re-resolve in case the OS flipped since paint.
      const stored = localStorage.getItem(MODE_KEY);
      const legacy = localStorage.getItem('theme');
      const m: ThemeMode =
        stored === 'light' || stored === 'dark' || stored === 'system'
          ? stored
          : legacy === 'dark' || legacy === 'light'
            ? legacy
            : 'system';
      mode.value = m;
      applyResolved(resolve(m));

      // One listener per app: while in system mode, follow OS changes live.
      if (!(useTheme as { _listening?: boolean })._listening) {
        (useTheme as { _listening?: boolean })._listening = true;
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (mode.value === 'system') applyResolved(e.matches ? 'dark' : 'light');
        });
      }
    });
  }

  return { mode, theme, isDark, toggle, setMode };
}
