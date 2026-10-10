'use client';

import { XhrProgressBar } from '@/components/common/xhr-progress-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { ConfirmProvider } from '@/lib/use-confirm';

/*
 * next-themes mirrors the Nuxt variant's useTheme contract exactly: the
 * resolved scheme lands in [data-theme] on <html>, the chosen mode
 * ('light' | 'dark' | 'system') persists under the same 'theme-mode'
 * localStorage key, and its injected pre-paint script replaces the Nuxt
 * anti-FOUC script. The only dropped behaviour is migrating the legacy
 * 'theme' key, which no Next-variant install can have.
 */
export function Providers({ children }: { children: React.ReactNode }) {
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
        <ConfirmProvider>
          {children}
          {/* One shared top bar for every instrumented XHR (see lib/xhr-progress). */}
          <XhrProgressBar />
          {/* Global toast outlet, themed as an MD3 snackbar (see globals.css). */}
          <Toaster position="bottom-right" toastOptions={{ className: 'md3-snackbar' }} />
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
