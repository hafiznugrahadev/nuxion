'use client';

/**
 * Sidebar shell state — the React port of the Nuxt useSidebar composable as a
 * framework-free external store (rail/drawer on desktop, off-canvas drawer on
 * mobile).
 */
export interface SidebarState {
  isExpanded: boolean;
  isMobileOpen: boolean;
}

let state: SidebarState = { isExpanded: true, isMobileOpen: false };
const listeners = new Set<() => void>();

function set(patch: Partial<SidebarState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function subscribeSidebar(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getSidebarState(): SidebarState {
  return state;
}

export function toggleExpanded() {
  set({ isExpanded: !state.isExpanded });
}

export function toggleMobile() {
  set({ isMobileOpen: !state.isMobileOpen });
}

export function closeMobile() {
  set({ isMobileOpen: false });
}
