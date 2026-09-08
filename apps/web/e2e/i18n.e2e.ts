import { test, expect } from '@playwright/test';
import { gotoHydrated } from './helpers';

test.describe('i18n', () => {
  test('switches the UI language to Indonesian and persists it', async ({ page }) => {
    await gotoHydrated(page, '/login');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    await page.getByTestId('language-switcher').click();
    await page.getByRole('button', { name: 'Bahasa Indonesia' }).click();

    // UI re-renders in Indonesian
    await expect(page.getByRole('heading', { name: 'Masuk' })).toBeVisible();

    // the choice is remembered (cookie) across a full reload
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Masuk' })).toBeVisible();
  });
});
