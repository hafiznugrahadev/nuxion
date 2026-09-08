import { test, expect } from '@playwright/test';
import { ADMIN, API_BASE, apiToken, login } from './helpers';

// A 1×1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function patchMe(request: Parameters<typeof apiToken>[0], data: Record<string, unknown>) {
  const token = await apiToken(request, ADMIN.email, ADMIN.password);
  await request.patch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
}

test.describe('profile', () => {
  test('edits the display name', async ({ page, request }) => {
    try {
      await login(page);
      await expect(page).toHaveURL(/\/dashboard/);
      await page.goto('/profile');
      await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible();

      await page.getByRole('button', { name: /^edit$/i }).click();
      await page.getByLabel('Full name').fill('Admin Edited');
      await page.getByRole('button', { name: /save changes/i }).click();

      await expect(page.getByRole('heading', { name: 'Admin Edited' })).toBeVisible();
    } finally {
      await patchMe(request, { name: 'Admin' });
    }
  });

  test('uploads an avatar', async ({ page, request }) => {
    // start from a known-clean avatar so we assert the upload, not a leftover
    await patchMe(request, { avatarUrl: '' });
    try {
      await login(page);
      await expect(page).toHaveURL(/\/dashboard/);
      await page.goto('/profile');
      await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible();

      await page.locator('input[type="file"]').setInputFiles({
        name: 'avatar.png',
        mimeType: 'image/png',
        buffer: PNG,
      });

      await expect(page.locator('img[src*="/uploads/avatars/"]')).toBeVisible();
    } finally {
      await patchMe(request, { avatarUrl: '' });
    }
  });
});
