import { ref } from 'vue';

/**
 * YouTube-style top progress bar, driven by in-flight XHRs (SPEC: lib/ stays
 * framework-free — a plain Vue ref is the only dependency). The api-client
 * factory and the auth store's bare `$fetch` calls report start/end here;
 * XhrProgressBar.vue renders the bar for these AND for route navigation (it
 * also watches Nuxt's shared loading-indicator state).
 *
 * Reference-counted: the bar shows while ≥1 request is in flight, so
 * concurrent queries animate a single bar instead of restarting per request.
 */

/** Number of instrumented XHRs currently in flight (module singleton). */
export const xhrPending = ref(0);

/** An instrumented XHR started. */
export function xhrProgressStart(): void {
  xhrPending.value += 1;
}

/** An instrumented XHR settled — success or error alike. */
export function xhrProgressEnd(): void {
  xhrPending.value = Math.max(0, xhrPending.value - 1);
}
