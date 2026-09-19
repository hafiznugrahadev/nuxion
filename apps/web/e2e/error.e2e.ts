import { test, expect } from '@playwright/test';
import { login } from './helpers';

/** Seed demo user with the plain USER role (see apps/api/prisma/seed.ts). */
const DEMO_USER = { email: 'demo.002@nuxion.test', password: 'demo1234' } as const;

test.describe('error pages', () => {
  test('404: unknown route renders the dedicated page with a way back home', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByRole('heading', { name: /lost in space/i })).toBeVisible();
    await expect(page.getByText(/page lost in orbit/i).first()).toBeVisible();
    await expect(page.getByTestId('error-page')).toBeVisible();

    await page.getByTestId('error-cta-primary').click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('404: destination chip navigates into the app', async ({ page }) => {
    await page.goto('/nope');

    // Unauthenticated visitors bounce off the auth middleware — either end of
    // that redirect proves the chip left the error screen through the app.
    await page
      .getByTestId('error-links')
      .getByRole('link', { name: /dashboard/i })
      .click();
    await expect(page).toHaveURL(/\/(login\?|admin\/dashboard)/);
  });

  test('403: non-admin on an admin route sees the forbidden page', async ({ page }) => {
    await login(page, DEMO_USER.email, DEMO_USER.password);
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // /admin/users is a CSR island — the guard fires client-side after the
    // session restore, so assert with the default generous timeout.
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /restricted area/i })).toBeVisible();
    await expect(page.getByTestId('error-session-card')).toContainText(DEMO_USER.email);

    await page.getByTestId('error-cta-primary').click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });
});
