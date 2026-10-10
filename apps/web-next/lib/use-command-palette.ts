'use client';

/**
 * Command palette open state — the React port of the Nuxt variant's
 * useCommandPalette composable as a framework-free external store. The ⌘K /
 * Ctrl+K global shortcut is bound by the palette component itself.
 */
let open = false;
const listeners = new Set<() => void>();

export function subscribePalette(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getPaletteOpen(): boolean {
  return open;
}

export function openPalette(): void {
  open = true;
  for (const listener of listeners) listener();
}

export function closePalette(): void {
  open = false;
  for (const listener of listeners) listener();
}
