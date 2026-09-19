import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { generate } from 'otplib';
import { API_BASE, apiToken, deleteUserByEmail, gotoHydrated, login } from './helpers';

/**
 * Full mandatory-2FA flow against a running stack with AUTH_2FA_ENABLED=true
 * (NUXT_PUBLIC_2FA_ENABLED=true on the web side). The rest of the suite runs
 * with the flag OFF — these tests self-skip so both modes stay green:
 *   E2E_2FA_ENABLED=true bun run test:e2e -- two-factor
 */
const ENABLED = process.env.E2E_2FA_ENABLED === 'true';
test.skip(!ENABLED, 'set E2E_2FA_ENABLED=true (and AUTH_2FA_ENABLED=true) to run');

/** Dedicated account so the shared seed admin is never left TOTP-locked. */
const USER = { email: 'e2e-2fa@nuxion.test', password: 'e2e2fapass1', name: 'E2E TwoFactor' };

/** Create the test account fresh (drops any prior TOTP state with it). */
async function ensureUser(request: APIRequestContext) {
  await deleteUserByEmail(request, USER.email);
  const token = await apiToken(request, 'superadmin@nuxion.test', 'super1234');
  const res = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { email: USER.email, name: USER.name, password: USER.password, roles: ['USER'] },
  });
  expect(res.ok()).toBeTruthy();
}

/** Read the pending secret straight off the setup page and finish activation. */
async function completeSetup(page: Page): Promise<string> {
  const secret = await page.getByTestId('totp-secret').textContent();
  expect(secret).toBeTruthy();

  await page.getByLabel('Verification code').fill(await generate({ secret }));
  await page.getByTestId('activate-2fa-button').click();

  const codes = page.getByTestId('recovery-code');
  await expect(codes.first()).toBeVisible();
  await expect(codes).toHaveCount(8);

  await page.getByTestId('finish-setup-button').click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  return secret;
}

test.describe('mandatory two-factor auth', () => {
  test.beforeEach(async ({ request }) => {
    await ensureUser(request);
  });

  test.afterEach(async ({ request }) => {
    await deleteUserByEmail(request, USER.email);
  });

  test('unactivated users are funnelled to setup and finish there', async ({ page }) => {
    // Password login succeeds, but the middleware parks the user on the setup page.
    await login(page, USER.email, USER.password);
    await expect(page).toHaveURL(/\/two-factor\/setup/);

    // Navigating away keeps bouncing back (the "hook" until activated).
    await gotoHydrated(page, '/admin/dashboard');
    await expect(page).toHaveURL(/\/two-factor\/setup/);

    await completeSetup(page);
  });

  test('login after activation asks for the OTP code', async ({ page }) => {
    await login(page, USER.email, USER.password);
    await expect(page).toHaveURL(/\/two-factor\/setup/);
    const secret = await completeSetup(page);

    // Sign out via the user menu, then sign in again — the OTP step appears.
    // Two UserMenu instances render (sidebar + header) — either works.
    await page.getByTestId('user-menu-trigger').first().click();
    await page.getByTestId('logout-button').click();
    await expect(page).toHaveURL(/\/login/);

    await login(page, USER.email, USER.password);
    await expect(page.getByText('Two-factor verification')).toBeVisible();
    await page.getByLabel('Verification code').fill(await generate({ secret }));
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });
});
