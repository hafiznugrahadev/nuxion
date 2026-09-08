import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Unit tests (src/**/*.spec.ts). Mirrors the tsconfig `paths` aliases that the
// old jest moduleNameMapper / build-time tsc-alias used to provide.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@common': resolve(__dirname, 'src/common'),
      '@config': resolve(__dirname, 'src/config'),
      '@infrastructure': resolve(__dirname, 'src/infrastructure'),
      '@modules': resolve(__dirname, 'src/modules'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@generated': resolve(__dirname, 'src/generated'),
    },
  },
});
