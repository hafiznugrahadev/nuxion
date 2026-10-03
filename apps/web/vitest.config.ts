import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests (app/**/*.test.ts) cover the framework-free logic layer: lib/,
// utils/, and store state. Anything needing the Nuxt runtime (auto-imports,
// plugins, SFC rendering) is exercised by the Playwright e2e suite instead.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
});
