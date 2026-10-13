import { describe, expect, it } from 'vitest';

/*
 * The generated theme module is the single registration point (do not edit
 * by hand): these assertions pin the wiring the layout attribute and the
 * provider both depend on.
 */
import { defaultThemeSlug, themes } from '../astryx-themes';

describe('astryx-themes (generated)', () => {
  it('registers the neutral theme as the default', () => {
    expect(defaultThemeSlug).toBe('neutral');
    expect(Object.keys(themes)).toContain('neutral');
  });

  it('exposes a usable theme object for the provider', () => {
    const theme = themes[defaultThemeSlug];
    expect(theme).toBeTruthy();
    expect(typeof theme).toBe('object');
  });
});
