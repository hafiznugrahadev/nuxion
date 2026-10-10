'use client';

import '@/app/globals.css';

/**
 * Root-level error boundary (root layout itself threw) — the App Router
 * counterpart of Nuxt's error.vue global role. Minimal by necessity: no
 * providers, no branding; the reload button retries the app, the copy stays
 * honest. app/error.tsx covers in-layout errors with the full Stitch design.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="grid min-h-svh place-items-center bg-background p-4 text-on-surface"
        data-testid="global-error"
      >
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            The application failed to render. Reloading usually fixes it.
          </p>
          {process.env.NODE_ENV !== 'production' && error?.digest && (
            <p className="font-mono text-xs text-on-surface-variant">{error.digest}</p>
          )}
          <button
            type="button"
            className="state-layer relative h-10 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
            onClick={() => void reset()}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
