import { test, expect } from '@playwright/test';
import {
  ADMIN,
  API_BASE,
  SUPER_ADMIN,
  apiLogin,
  deleteUserByEmail,
  login,
  waitForHydration,
} from './helpers';

// A 1×1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function patchMe(request: Parameters<typeof apiLogin>[0], data: Record<string, unknown>) {
  await apiLogin(request, ADMIN.email, ADMIN.password);
  await request.patch(`${API_BASE}/users/me`, {
    data,
  });
}

test.describe('profile', () => {
  test('changing a password signs out and accepts the new password', async ({ page, request }) => {
    const email = `e2e-password-${Date.now()}@nuxion.test`;
    const password = 'original-password-123';
    const newPassword = 'replacement-password-456';
    await apiLogin(request, SUPER_ADMIN.email, SUPER_ADMIN.password);
    const created = await request.post(`${API_BASE}/users`, {
      data: { email, name: 'Password Test', password, roles: ['ADMIN'] },
    });
    expect(created.ok()).toBeTruthy();
    try {
      await login(page, email, password);
      await expect(page).toHaveURL(/\/admin\/dashboard/);
      await page.goto('/admin/profile');
      await waitForHydration(page);
      await page
        .getByLabel(/^Current password(?:\s*\*)?$/)
        .and(page.locator('input[name="currentPassword"]'))
        .fill(password);
      await page
        .getByLabel(/^New password(?:\s*\*)?$/)
        .and(page.locator('input'))
        .fill(newPassword);
      await page
        .getByLabel(/^Confirm new password(?:\s*\*)?$/)
        .and(page.locator('input'))
        .fill(newPassword);
      await page.getByRole('button', { name: 'Update password', exact: true }).click();
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Update password', exact: true })
        .click();
      await expect(page).toHaveURL(/\/login/);
      await login(page, email, newPassword);
      await expect(page).toHaveURL(/\/admin\/dashboard/);
    } finally {
      await deleteUserByEmail(request, email);
    }
  });

  test('edits the display name', async ({ page, request }) => {
    try {
      await login(page);
      await expect(page).toHaveURL(/\/admin\/dashboard/);
      await page.goto('/admin/profile');
      await waitForHydration(page);
      await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible();

      await page.getByRole('button', { name: /^edit$/i }).click();
      await page.getByRole('textbox', { name: /^Full name(?:\s*\*)?$/ }).fill('Admin Edited');
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
      await expect(page).toHaveURL(/\/admin\/dashboard/);
      await page.goto('/admin/profile');
      await waitForHydration(page);
      await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible();

      await page.locator('input[type="file"]').setInputFiles({
        name: 'avatar.png',
        mimeType: 'image/png',
        buffer: PNG,
      });

      // Driver-agnostic: local storage serves /uploads/avatars/, S3 serves
      // presigned /api/files/view?key=avatars%2F… — both carry the folder.
      await expect(
        page.getByRole('main').locator('img[src*="/uploads/avatars/"], img[src*="avatars%2F"]'),
      ).toBeVisible();
    } finally {
      await patchMe(request, { avatarUrl: '' });
    }
  });
});
