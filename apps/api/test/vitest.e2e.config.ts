import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// E2E tests (test/**/*.e2e-spec.ts). Same aliases as the unit config, but
// resolved from the repo root because specs import app code via @common/…
// and helpers via relative paths. Long timeout mirrors the old jest-e2e.json.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@common': resolve(__dirname, '../src/common'),
      '@config': resolve(__dirname, '../src/config'),
      '@infrastructure': resolve(__dirname, '../src/infrastructure'),
      '@modules': resolve(__dirname, '../src/modules'),
      '@shared': resolve(__dirname, '../src/shared'),
      '@generated': resolve(__dirname, '../src/generated'),
    },
  },
});
