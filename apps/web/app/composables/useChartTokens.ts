/**
 * Resolved design tokens for ApexCharts.
 *
 * Charts take colors as JS config, so they can't consume Tailwind classes and
 * would otherwise drift from the design system. Reading the *computed* custom
 * properties off <html> instead means charts follow the [data-theme] MD3 scheme
 * with no per-chart palette to maintain.
 *
 * Fallbacks are the MD3 baseline light values, used during SSR where there is
 * no computed style to read; the client re-evaluates on mount and on theme
 * change.
 */
export function useChartTokens() {
  const { theme, isDark } = useTheme();

  function read(name: string, fallback: string): string {
    if (!import.meta.client) return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  const tokens = computed(() => {
    // Depend on theme so the same var name is re-read after a light/dark flip.
    void theme.value;
    return {
      brand: read('--primary', '#5c631d'),
      grid: read('--border', '#c8c7b7'),
      label: read('--muted-foreground', '#47483b'),
      strong: read('--foreground', '#1c1c14'),
      track: read('--muted', '#e5e3d6'),
      font: read('--font-sans', 'Google Sans, sans-serif'),
    };
  });

  return { tokens, isDark };
}
