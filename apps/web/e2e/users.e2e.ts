import { test, expect } from '@playwright/test';
import {
  API_BASE,
  SUPER_ADMIN,
  apiToken,
  deleteUserByEmail,
  login,
  waitForHydration,
} from './helpers';

test.describe('users (super admin)', () => {
  test('lists seed users in the table', async ({ page }) => {
    await login(page, SUPER_ADMIN.email, SUPER_ADMIN.password);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await page.goto('/admin/users');
    await waitForHydration(page);
    // exact — otherwise it also substring-matches "superadmin@nuxion.test".
    await expect(page.getByText('admin@nuxion.test', { exact: true })).toBeVisible();
  });

  test('creates and deletes a user via the modal', async ({ page, request }) => {
    const email = `e2e-user-${Date.now()}@nuxion.test`;
    try {
      await login(page, SUPER_ADMIN.email, SUPER_ADMIN.password);
      await expect(page).toHaveURL(/\/admin\/dashboard/);
      await page.goto('/admin/users');
      await waitForHydration(page);

      // create
      await page.getByRole('button', { name: /add user/i }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('New user')).toBeVisible();
      await dialog.getByPlaceholder('jane@nuxion.test').fill(email);
      await dialog.getByPlaceholder('Jane Doe').fill('E2E User');
      await dialog.getByPlaceholder('••••••••').fill('e2e-pass-123');
      await dialog.getByRole('button', { name: /create user/i }).click();

      // filter to the new row and confirm it exists
      await page.getByPlaceholder('Search users…').fill(email);
      await expect(page.getByText(email)).toBeVisible();

      // delete via the row action + confirm dialog
      await page.getByRole('button', { name: 'Delete' }).first().click();
      const confirm = page.getByRole('dialog');
      await expect(confirm.getByText(/delete user/i)).toBeVisible();
      await confirm.getByRole('button', { name: /^delete$/i }).click();
      await expect(page.getByText(email)).toHaveCount(0);
    } finally {
      await deleteUserByEmail(request, email);
    }
  });

  test('edits a user via the modal', async ({ page, request }) => {
    const email = `e2e-edit-${Date.now()}@nuxion.test`;
    const token = await apiToken(request, SUPER_ADMIN.email, SUPER_ADMIN.password);
    await request.post(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email, name: 'Edit Target', password: 'e2e-pass-123', roles: ['USER'] },
    });
    try {
      await login(page, SUPER_ADMIN.email, SUPER_ADMIN.password);
      await expect(page).toHaveURL(/\/admin\/dashboard/);
      await page.goto('/admin/users');
      await waitForHydration(page);

      await page.getByPlaceholder('Search users…').fill(email);
      await expect(page.getByText(email, { exact: true })).toBeVisible();

      // open the edit modal, change the name, save
      await page.getByRole('button', { name: 'Edit' }).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Edit user')).toBeVisible();
      await dialog.getByPlaceholder('Jane Doe').fill('Edited Name');
      await dialog.getByRole('button', { name: /save changes/i }).click();

      await expect(page.getByText('Edited Name', { exact: true })).toBeVisible();
    } finally {
      await deleteUserByEmail(request, email);
    }
  });

  test('filters the table by role tags (multi-select, server-side)', async ({ page }) => {
    await login(page, SUPER_ADMIN.email, SUPER_ADMIN.password);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await page.goto('/admin/users');
    await waitForHydration(page);

    const table = page.getByRole('table');
    await expect(table.getByText('user@nuxion.test', { exact: true })).toBeVisible();

    // select two tags → users holding ANY of them (super-admin + admin), not the plain user
    await page.getByRole('button', { name: 'Super Admin', exact: true }).click();
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await expect(table.getByText('superadmin@nuxion.test', { exact: true })).toBeVisible();
    await expect(table.getByText('admin@nuxion.test', { exact: true })).toBeVisible();
    await expect(page.getByText('user@nuxion.test', { exact: true })).toHaveCount(0);

    // reset with the "All" tag
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(table.getByText('user@nuxion.test', { exact: true })).toBeVisible();
  });
});
