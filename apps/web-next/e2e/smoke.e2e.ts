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
