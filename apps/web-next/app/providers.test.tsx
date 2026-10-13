import { renderJsx } from '@/lib/test-render';
import { describe, expect, it, vi, beforeEach } from 'vitest';

/*
 * The provider bridge contract: next-themes stays the single source of the
 * scheme preference and the Astryx <Theme> must receive it as `mode`, with
 * 'system' only while the resolution is still pending (pre-mount).
 */

const themeProps: { theme: unknown; mode: string }[] = [];

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: (globalThis as { __resolved?: string }).__resolved }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@astryxdesign/core', () => ({
  Theme: ({ theme, mode, children }: { theme: unknown; mode: string; children: React.ReactNode }) => {
    themeProps.push({ theme, mode });
    return <>{children}</>;
  },
}));

vi.mock('@/astryx-themes', () => ({
  themes: { neutral: { name: 'neutral' } },
  defaultThemeSlug: 'neutral' as const,
}));

import { AstryxThemeProvider } from './providers';

describe('AstryxThemeProvider', () => {
  beforeEach(() => {
    themeProps.length = 0;
    delete (globalThis as { __resolved?: string }).__resolved;
  });

  it('passes the neutral theme with the resolved mode (client render)', () => {
    (globalThis as { __resolved?: string }).__resolved = 'dark';
    const { host } = renderJsx(
      <AstryxThemeProvider>
        <p>child</p>
      </AstryxThemeProvider>,
    );
    // A plain client render hydrates nothing: the is-hydrated probe is true
    // immediately, so a single render carries the resolved scheme. The
    // SSR-parity 'system' pass happens only under real hydration (verified
    // in-browser: no hydration-mismatch console error).
    expect(themeProps).toHaveLength(1);
    expect(themeProps[0]).toEqual({ theme: { name: 'neutral' }, mode: 'dark' });
    expect(host.textContent).toBe('child');
  });

  it('maps resolved dark to mode dark', () => {
    (globalThis as { __resolved?: string }).__resolved = 'dark';
    renderJsx(<AstryxThemeProvider>child</AstryxThemeProvider>);
    expect(themeProps.at(-1)?.mode).toBe('dark');
  });

  it('maps resolved light to mode light', () => {
    (globalThis as { __resolved?: string }).__resolved = 'light';
    renderJsx(<AstryxThemeProvider>child</AstryxThemeProvider>);
    expect(themeProps.at(-1)?.mode).toBe('light');
  });

  it('falls back to system while unresolved', () => {
    renderJsx(<AstryxThemeProvider>child</AstryxThemeProvider>);
    expect(themeProps.at(-1)?.mode).toBe('system');
  });
});
