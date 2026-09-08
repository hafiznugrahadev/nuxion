/**
 * Generate the MD3 color-role values used by apps/web/app/assets/css/main.css.
 *
 * Usage:
 *   bun apps/web/scripts/generate-md3-tokens.ts [#seedHex]
 *
 * Defaults to the project seed (Material Lime 500). Prints the `:root` (light)
 * and `[data-theme='dark']` blocks; paste them into main.css and keep the
 * header comment in sync. TonalSpot is the Material Theme Builder default
 * variant. Contrast 0 = standard level.
 */
import { argbFromHex, hexFromArgb, Hct, SchemeTonalSpot } from '@material/material-color-utilities';

const DEFAULT_SEED = '#cddc39'; // Material Lime 500
const seed = process.argv[2] ?? DEFAULT_SEED;

// camelCase Scheme props in the exact order main.css declares the vars.
const ROLES = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'surface',
  'onSurface',
  'onSurfaceVariant',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'inverseSurface',
  'inverseOnSurface',
  'inversePrimary',
  'outline',
  'outlineVariant',
] as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

function block(dark: boolean): string {
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)), dark, 0.0);
  const lines = ROLES.map((role) => {
    const value = hexFromArgb(scheme[role]);
    return `  --${kebab(role)}: ${value.toLowerCase()};`;
  });
  const header = dark ? "[data-theme='dark']" : ':root';
  return `${header} {\n${lines.join('\n')}\n}`;
}

console.log(`/* Seed: ${seed} · variant: TonalSpot · contrast: 0 (standard) */`);
console.log(block(false));
console.log(block(true));
