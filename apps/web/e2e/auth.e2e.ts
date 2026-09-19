import { test, expect } from '@playwright/test';
import { ADMIN, login } from './helpers';

test.describe('authentication', () => {
  test('redirects unauthenticated users to the login page', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in with valid credentials and reaches the dashboard', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('redirects authenticated users away from the login page', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // A hard visit to /login with a live session should bounce right back.
    // domcontentloaded: the dev server can hold the `load` event hostage
    // behind slow chunks; the redirect assertion does the real waiting.
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('login redirect honors the intended page for authenticated visitors', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.goto('/login?redirect=/admin/profile', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin\/profile/);
  });

  test('rejects invalid credentials and stays on the login page', async ({ page }) => {
    await login(page, ADMIN.email, 'wrong-password');
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('signs out from the user menu', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await page.getByTestId('user-menu-trigger').first().click();
    await page.getByTestId('logout-button').first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});
