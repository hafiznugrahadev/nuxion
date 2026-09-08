import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Runs against the already-running dev stack (`docker compose up`):
 *   web → http://localhost:4300, api → :4400, Mailpit → :8025.
 * Override the target with E2E_BASE_URL. Tests are serialised (workers: 1) because
 * the password-reset spec mutates the shared seed admin account.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4300';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // Retry once — the dev server compiles routes on first access, so the first hit
  // of a cold route can briefly exceed an assertion timeout.
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? 'github' : 'list',
  // Generous timeouts: this runs against the Nuxt DEV server (HMR + on-demand
  // route compilation), not a production build.
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
