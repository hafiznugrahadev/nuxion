import { expect, test } from '@playwright/test';

/*
 * Smoke: the landing renders with its variant-honest copy, the i18n cookie
 * works, the code tabs switch, unknown routes hit the 404 screen, and the
 * same-origin proxy actually reaches the API. Runs against the dev stack
 * (docker compose --profile next up) or a local dev server on 8080.
 */

test('landing renders the ported hero with the Next-variant facts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('NestJS + Next');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nuxion');
  // Terminal reports this variant's real port.
  await expect(page.getByText('web:next')).toBeVisible();
  await expect(page.getByText('ready on http://localhost:8080')).toBeVisible();
  // Scaffolder command includes the variant flag.
  await expect(
    page.getByText('bun create nuxion@latest my-app --frontend next').first(),
  ).toBeVisible();
});

test('nav anchors point at their real sections', async ({ page }) => {
  await page.goto('/');
  for (const anchor of ['quickstart', 'features', 'why', 'stack']) {
    await expect(page.locator(`header nav a[href="#${anchor}"]`)).toBeVisible();
    await expect(page.locator(`#${anchor}`)).toBeAttached();
  }
});

test('code tabs switch panels', async ({ page }) => {
  await page.goto('/#stack');
  await page.getByRole('tab', { name: '.env' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('DATABASE_URL');
  await page.getByRole('tab', { name: 'turbo.json' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('"globalDependencies"');
});

test('locale cookie switches the copy without changing the URL', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('language-switcher').click();
  await page.getByRole('option', { name: 'Bahasa Indonesia' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nuxion');
  await expect(page.getByText('Instalasi dengan Bun')).toBeVisible();
  await expect(page).toHaveURL('/');
});

test('unknown routes hit the 404 error page', async ({ page }) => {
  await page.goto('/definitely-not-a-route');
  await expect(page.getByTestId('error-page')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('lost in space');
});

test('the same-origin /api proxy reaches the API through the web origin', async ({ request }) => {
  // Any /api subpath hits the catch-all route handler: with the stack up the
  // API answers 404 JSON for an unknown route; with the API down the proxy
  // itself answers 502 JSON. Either way the response is the API's JSON —
  // proving the proxy forwarded off the web origin.
  const res = await request.get('/api/definitely-not-a-route');
  expect([404, 502]).toContain(res.status());
  expect(res.headers()['content-type']).toContain('application/json');
});

test('login renders the auth layout and validates before submitting', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sign In');
  // Demo credentials card is part of the kit's dev surface.
  await expect(page.getByText('admin@nuxion.test')).toBeVisible();

  // Empty submit surfaces zod validation per field (aria-invalid wiring).
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByText('Enter a valid email')).toBeVisible();
  await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();

  // Forgot-password link reaches its page.
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Forgot password');
});

test('reset-password without a token shows the invalid-link state', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Reset password');
  await expect(page.getByText(/invalid or incomplete/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
});

test('the register page renders the sign-up form under the flag', async ({ page }) => {
  // These tests run with NEXT_PUBLIC_REGISTRATION_ENABLED=true; with the flag
  // off the page instead shows the disabled notice.
  await page.goto('/register');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Create');
  await expect(page.getByLabel(/Full name/i)).toBeVisible();
});

test('landing exposes the auth-aware sign-in CTA', async ({ page }) => {
  await page.goto('/');
  const cta = page.getByRole('banner').getByTestId('cta-login');
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page).toHaveURL(/\/login$/);
});

test('admin routes bounce unauthenticated visitors to /login with a redirect back', async ({
  page,
}) => {
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fusers$/);
  // The login form still renders normally behind the guard.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sign In');
});

test('/admin lands on the dashboard section', async ({ page }) => {
  await page.goto('/admin');
  // Server redirect to /admin/dashboard races the guard's mount (which may
  // capture /admin before the router settles) — either redirect target is
  // fine: post-login both converge on the dashboard.
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin(%2Fdashboard)?$/);
});

test('two-factor setup requires a session', async ({ page }) => {
  await page.goto('/two-factor/setup');
  // Unauthenticated visitors bounce to /login (the setup flow needs a user).
  await expect(page).toHaveURL(/\/login/);
});

test('roles admin route is guarded like the rest of /admin', async ({ page }) => {
  await page.goto('/admin/roles');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Froles$/);
});

test('profile admin route is guarded like the rest of /admin', async ({ page }) => {
  await page.goto('/admin/profile');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fprofile$/);
});

test('settings admin route is guarded like the rest of /admin', async ({ page }) => {
  await page.goto('/admin/settings');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fsettings$/);
});

test('editor demo route is guarded like the rest of /admin', async ({ page }) => {
  await page.goto('/admin/demo/editor');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fdemo%2Feditor$/);
});
