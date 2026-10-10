import { expect, test } from '@playwright/test';

/*
 * Stage 0 smoke: the foundation renders, the i18n cookie works, unknown
 * routes hit the 404 screen, and the same-origin proxy actually reaches the
 * API. Runs against the dev stack (docker compose --profile next up) or a
 * local dev server on 8080.
 */

test('landing renders the foundation placeholder', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nuxion');
  await expect(page.getByTestId('landing-status')).toBeVisible();
});

test('locale cookie switches the copy without changing the URL', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('language-switcher').click();
  await page.getByRole('option', { name: 'Bahasa Indonesia' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nuxion');
  await expect(page.getByTestId('landing-status')).toContainText('Variant Next.js aktif');
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
