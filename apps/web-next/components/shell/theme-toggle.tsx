'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

const CYCLE: ThemeMode[] = ['light', 'dark', 'system'];
const ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};
// Label names the NEXT mode (action label, per a11y convention) — kept in
// English like the Nuxt variant's toggle.
const NEXT_LABEL: Record<ThemeMode, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system theme',
  system: 'Switch to light mode',
};

// Hydration-safe "mounted" guard without a setState-in-effect: the client
// snapshot is always true, the server snapshot always false.
const emptySubscribe = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    // Placeholder keeps the layout stable while the client resolves the mode
    // (the pre-paint script has already applied the correct scheme).
    return <div className="h-10 w-10 rounded-full" />;
  }

  const mode = (theme as ThemeMode) ?? 'system';
  const Icon = ICONS[mode];

  return (
    <button
      type="button"
      className="touch-target relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground"
      aria-label={NEXT_LABEL[mode]}
      title={`Theme: ${mode}${mode === 'system' ? ` (${resolvedTheme})` : ''}`}
      onClick={() => setTheme(CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length])}
    >
      <Icon size={22} aria-hidden="true" />
    </button>
  );
}
