/**
 * YouTube-style top progress bar, driven by in-flight XHRs (port of the Nuxt
 * variant's lib/xhr-progress.ts as a framework-free external store —
 * useSyncExternalStore subscribes in the bar component). The api-client
 * factory and the auth calls report start/end here; XhrProgressBar renders
 * the bar. Navigation progress stays a Nuxt concern (NuxtLoadingIndicator
 * had no Next equivalent worth faking).
 *
 * Reference-counted: the bar shows while ≥1 request is in flight, so
 * concurrent queries animate a single bar instead of restarting per request.
 */

let pending = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Subscribe to counter changes (useSyncExternalStore contract). */
export function subscribeXhrPending(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Snapshot for useSyncExternalStore. */
export function getXhrPending(): number {
  return pending;
}

/** An instrumented XHR started. */
export function xhrProgressStart(): void {
  pending += 1;
  emit();
}

/** An instrumented XHR settled — success or error alike. */
export function xhrProgressEnd(): void {
  pending = Math.max(0, pending - 1);
  emit();
}
