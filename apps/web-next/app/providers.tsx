'use client';

import { XhrProgressBar } from '@/components/common/xhr-progress-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme as AstryxTheme, type ThemeMode } from '@astryxdesign/core';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ConfirmProvider } from '@/lib/use-confirm';
import { BrandingProvider } from '@/components/common/branding-provider';
import { themes, defaultThemeSlug } from '@/astryx-themes';
import type { BrandingSettings } from '@nuxion/shared-types';

const emptySubscribe = () => () => {};

/*
 * Astryx token layer driven by the next-themes preference: next-themes keeps
 * the pre-paint script, the 'theme-mode' storage key, and [data-theme] on
 * <html> (Nuxt-variant parity); its resolved scheme feeds the Astryx
 * <Theme mode> so the two providers can never disagree. Until hydration the
 * mode stays 'system' so the first client render matches SSR (the wrapper's
 * attributes differ per mode); next-themes' pre-paint script has already
 * resolved html[data-theme], so color-scheme and the light-dark() tokens are
 * correct from the first paint either way.
 */
export function AstryxThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  // The canonical is-hydrated probe: false from the server snapshot, true on
  // the client after hydration, without a setState-in-effect.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const mode: ThemeMode = !mounted
    ? 'system'
    : resolvedTheme === 'dark'
      ? 'dark'
      : resolvedTheme === 'light'
        ? 'light'
        : 'system';
  return (
    <AstryxTheme theme={themes[defaultThemeSlug]} mode={mode}>
      {children}
    </AstryxTheme>
  );
}

/*
 * next-themes mirrors the Nuxt variant's useTheme contract exactly: the
 * resolved scheme lands in [data-theme] on <html>, the chosen mode
 * ('light' | 'dark' | 'system') persists under the same 'theme-mode'
 * localStorage key, and its injected pre-paint script replaces the Nuxt
 * anti-FOUC script. The only dropped behaviour is migrating the legacy
 * 'theme' key, which no Next-variant install can have.
 */
export function Providers({
  initialBranding,
  children,
}: {
  initialBranding?: BrandingSettings;
  children: React.ReactNode;
}) {
  // Hydration marker: e2e waits for this before clicking submit buttons —
  // a non-hydrated React form falls back to a native GET submit.
  useEffect(() => {
    document.body.dataset.hydrated = 'true';
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="system"
        storageKey="theme-mode"
        enableSystem
      >
        <AstryxThemeProvider>
          <BrandingProvider initial={initialBranding}>
            <ConfirmProvider>
              {children}
              {/* One shared top bar for every instrumented XHR (see lib/xhr-progress). */}
              <XhrProgressBar />
              {/* Global toast outlet, themed as an MD3 snackbar (see globals.css). */}
              <Toaster position="bottom-right" toastOptions={{ className: 'md3-snackbar' }} />
            </ConfirmProvider>
          </BrandingProvider>
        </AstryxThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
