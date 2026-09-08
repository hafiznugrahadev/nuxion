import { test, expect } from '@playwright/test';
import { ADMIN, deleteUserByEmail, gotoHydrated } from './helpers';

test.describe('registration', () => {
  test('registers a new account and lands on the dashboard', async ({ page, request }) => {
    const email = `e2e-register-${Date.now()}@nuxion.test`;
    try {
      await gotoHydrated(page, '/register');
      await page.getByLabel('Full name').fill('E2E Newcomer');
      await page.getByLabel('Email').fill(email);
      await page.locator('#password').fill('e2e-pass-123');
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    } finally {
      await deleteUserByEmail(request, email);
    }
  });

  test('rejects a duplicate email', async ({ page }) => {
    await gotoHydrated(page, '/register');
    await page.getByLabel('Full name').fill('Dupe');
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.locator('#password').fill('whatever-123');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/already registered/i)).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });
});
