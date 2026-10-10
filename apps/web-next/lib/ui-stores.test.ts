import { describe, expect, it, vi } from 'vitest';
import { getBranding, setBranding, subscribeBranding } from './branding';
import {
  closeMobile,
  getSidebarState,
  subscribeSidebar,
  toggleExpanded,
  toggleMobile,
} from './use-sidebar';
import { closePalette, getPaletteOpen, openPalette, subscribePalette } from './use-command-palette';

describe('branding store', () => {
  it('seeds defaults, applies updates, notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBranding(listener);
    expect(getBranding()).toEqual({ appName: 'Nuxion', logoUrl: null, faviconUrl: null });

    setBranding({ appName: 'Renamed', logoUrl: 'l.png', faviconUrl: null });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getBranding().appName).toBe('Renamed');

    unsubscribe();
    setBranding({ appName: 'Nuxion', logoUrl: null, faviconUrl: null });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getBranding().appName).toBe('Nuxion');
  });
});

describe('sidebar store', () => {
  it('toggles expanded/mobile and notifies only while subscribed', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSidebar(listener);
    expect(getSidebarState()).toEqual({ isExpanded: true, isMobileOpen: false });

    toggleExpanded();
    expect(getSidebarState().isExpanded).toBe(false);
    toggleMobile();
    expect(getSidebarState().isMobileOpen).toBe(true);
    closeMobile();
    expect(getSidebarState().isMobileOpen).toBe(false);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    toggleExpanded();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(getSidebarState().isExpanded).toBe(true); // restored for other tests
  });
});

describe('command palette store', () => {
  it('opens/closes and notifies', () => {
    const listener = vi.fn();
    const unsubscribe = subscribePalette(listener);
    expect(getPaletteOpen()).toBe(false);

    openPalette();
    expect(getPaletteOpen()).toBe(true);
    closePalette();
    expect(getPaletteOpen()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
