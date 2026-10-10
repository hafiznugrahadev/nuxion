import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { setBranding } from './branding';
import { usePageTitle } from './use-page-title';
import { renderHook } from './test-render';

describe('usePageTitle', () => {
  it('sets "<title> · <appName>" once mounted and follows branding', () => {
    setBranding({ appName: 'Portal Desa', logoUrl: null, faviconUrl: null });
    const { unmount } = renderHook(() => usePageTitle('Users'));
    expect(document.title).toBe('Users · Portal Desa');

    // A branding update re-runs the effect with the new name (act flushes
    // the external-store-driven re-render).
    act(() => {
      setBranding({ appName: 'Renamed', logoUrl: null, faviconUrl: null });
    });
    expect(document.title).toBe('Users · Renamed');
    unmount();

    setBranding({ appName: 'Nuxion', logoUrl: null, faviconUrl: null });
  });
});
