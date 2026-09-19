/*
 * Payload plugin: override pinia 2.3.x's "skipHydrate" reducer with a
 * prototype-safe equivalent.
 *
 * Bug (pre-existing on main): Nuxt builds the internal /__nuxt_error payload
 * object with a null prototype, and pinia's registered reducer calls
 * `obj.hasOwnProperty(...)` directly — which throws on null-prototype
 * objects. Every SSR-rendered error page (404, 500, …) then degrades to
 * Nuxt's bare fallback layout with a 500.
 *
 * Fixed upstream in pinia ≥3 via Object.prototype.hasOwnProperty.call
 * (vuejs/pinia#2843). This override mirrors that fix and can be deleted once
 * the app upgrades pinia. The reducer only ever matches values marked with
 * pinia's skipHydrate() helper, and nothing in this codebase (or its deps)
 * calls it — so a flat "no match" is behaviorally identical while staying
 * crash-free on any payload node.
 */
export default definePayloadPlugin(() => {
  definePayloadReducer('skipHydrate', () => false);
  definePayloadReviver('skipHydrate', () => undefined);
});
