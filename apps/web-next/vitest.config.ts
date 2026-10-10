import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Pure logic tests run fine under happy-dom; it stays the environment so
// component tests can join the same config without a migration.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: [
      'app/**/*.test.{ts,tsx}',
      'components/**/*.test.{ts,tsx}',
      'lib/**/*.test.{ts,tsx}',
      'features/**/*.test.{ts,tsx}',
    ],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
