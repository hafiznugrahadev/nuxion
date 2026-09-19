import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

// Unit tests (src/**/*.spec.ts). Mirrors the tsconfig `paths` aliases that the
// old jest moduleNameMapper / build-time tsc-alias used to provide.
// SWC supplies the TypeScript decorator metadata (design:paramtypes) esbuild
// cannot emit — constructor-injected Nest services need it under vitest.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
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
