import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the Next variant. Runs against the already-running dev stack
 * (`docker compose --profile next up`, port 8080) or a local
 * `bun run --filter @nuxion/web-next dev`. Override the target with E2E_BASE_URL.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    // Headless only — no headed or UI-mode runs (standing rule).
    headless: true,
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
