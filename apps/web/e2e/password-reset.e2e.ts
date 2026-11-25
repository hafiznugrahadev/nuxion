import { test, expect } from '@playwright/test';
import { ADMIN, MAILPIT, gotoHydrated, latestResetLink, resetPasswordViaApi } from './helpers';

test.describe('password reset', () => {
  test('shows an honest unavailable state when password reset is disabled', async ({ page }) => {
    await page.route('**/api/auth/forgot-password', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Password reset is temporarily unavailable',
        }),
      }),
    );
    await gotoHydrated(page, '/forgot-password');
    await page.getByRole('textbox', { name: /^Email(?:\s*\*)?$/ }).fill(ADMIN.email);
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(
      page.getByText('Password reset is unavailable. Contact your administrator.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeEnabled();
    await expect(page.getByText(/reset link is on its way/i)).toHaveCount(0);
  });

  test('forgot-password shows a confirmation message', async ({ page }) => {
    await gotoHydrated(page, '/forgot-password');
    await page.getByRole('textbox', { name: /^Email(?:\s*\*)?$/ }).fill(ADMIN.email);
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/reset link is on its way/i)).toBeVisible();
  });

  test('reset-password page rejects a missing token', async ({ page }) => {
    await gotoHydrated(page, '/reset-password');
    await expect(page.getByText(/invalid or incomplete/i)).toBeVisible();
  });

  test('completes the full reset flow via Mailpit', async ({ page, request }) => {
    const newPassword = 'reset-pass-123';
    try {
      await request.delete(`${MAILPIT}/api/v1/messages`);

      // 1. request a reset from the UI
      await gotoHydrated(page, '/forgot-password');
      await page.getByRole('textbox', { name: /^Email(?:\s*\*)?$/ }).fill(ADMIN.email);
      await page.getByRole('button', { name: /send reset link/i }).click();
      await expect(page.getByText(/reset link is on its way/i)).toBeVisible();

      // 2. open the emailed link and choose a new password
      const link = await latestResetLink(request);
      await gotoHydrated(page, link);
      await page
        .getByLabel(/^New password(?:\s*\*)?$/)
        .and(page.locator('input'))
        .fill(newPassword);
      await page
        .getByLabel(/^Confirm password(?:\s*\*)?$/)
        .and(page.locator('input'))
        .fill(newPassword);
      await page.getByRole('button', { name: /reset password/i }).click();
      await expect(page).toHaveURL(/\/login/);

      // 3. the new password actually works
      await page.getByRole('textbox', { name: /^Email(?:\s*\*)?$/ }).fill(ADMIN.email);
      await page.locator('#password').fill(newPassword);
      await page.getByRole('button', { name: /^sign in$/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    } finally {
      // restore the seed password so the suite stays idempotent
      await resetPasswordViaApi(request, ADMIN.email, ADMIN.password);
    }
  });
});
