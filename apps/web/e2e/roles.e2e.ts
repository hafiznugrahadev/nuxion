import { test, expect } from '@playwright/test';
import {
  API_BASE,
  SUPER_ADMIN,
  apiToken,
  deleteRoleByName,
  login,
  waitForHydration,
} from './helpers';

/** Custom roles render humanized (underscores → spaces, lowercase). */
const humanize = (name: string) => name.replaceAll('_', ' ').toLowerCase();

test.describe('roles (super admin)', () => {
  const roleName = `E2E_EDITOR_${Date.now()}`;
  const renamedTo = `E2E_RENAMED_${Date.now()}`;

  test.afterAll(async ({ request }) => {
    // Deleting the role also un-assigns it (cascade), restoring seed users.
    await deleteRoleByName(request, roleName);
    await deleteRoleByName(request, renamedTo);
  });

  test('lists built-in roles with rename/delete disabled', async ({ page }) => {
    await login(page, SUPER_ADMIN.email, SUPER_ADMIN.password);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await page.goto('/admin/roles');
    await waitForHydration(page);

    const table = page.getByRole('table');
    await expect(table.getByText('user@nuxion.test', { exact: true })).toHaveCount(0); // sanity: not the users page
    const builtIn = table.getByRole('row', { name: /super admin/i });
    await expect(builtIn.getByText('Built-in')).toBeVisible();
    await expect(builtIn.getByRole('button', { name: 'Rename role' })).toBeDisabled();
    await expect(builtIn.getByRole('button', { name: 'Delete role' })).toBeDisabled();
  });

  test('creates, renames, and deletes a custom role via the UI', async ({ page }) => {
    await login(page, SUPER_ADMIN.email, SUPER_ADMIN.password);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await page.goto('/admin/roles');
    await waitForHydration(page);
    const table = page.getByRole('table');

    // create
    await page.getByRole('button', { name: /add role/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New role')).toBeVisible();
    await dialog.getByPlaceholder('CONTENT_EDITOR').fill(roleName);
    await dialog.getByRole('button', { name: /create role/i }).click();
    const row = table.getByRole('row', { name: new RegExp(humanize(roleName), 'i') });
    await expect(row).toBeVisible();

    // rename via the row action
    await row.getByRole('button', { name: 'Rename role' }).click();
    await expect(dialog.getByText('Rename role')).toBeVisible();
    await dialog.getByPlaceholder('CONTENT_EDITOR').fill(renamedTo);
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expect(
      table.getByRole('row', { name: new RegExp(humanize(renamedTo), 'i') }),
    ).toBeVisible();

    // delete via the row action + confirm dialog (AlertDialog → role=alertdialog)
    const renamedRow = table.getByRole('row', { name: new RegExp(humanize(renamedTo), 'i') });
    await renamedRow.getByRole('button', { name: 'Delete role' }).click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm.getByText(/delete role/i)).toBeVisible();
    await confirm.getByRole('button', { name: /^delete$/i }).click();
    await expect(
      table.getByRole('row', { name: new RegExp(humanize(renamedTo), 'i') }),
    ).toHaveCount(0);
  });

  test('custom role is assignable from the user edit modal', async ({ page, request }) => {
    const token = await apiToken(request, SUPER_ADMIN.email, SUPER_ADMIN.password);
    await request.post(`${API_BASE}/roles`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: roleName },
    });

    await login(page, SUPER_ADMIN.email, SUPER_ADMIN.password);
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // the filter sheet lists it too (options come from the same catalog)
    await page.goto('/admin/users');
    await waitForHydration(page);
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    const sheet = page.getByRole('dialog');
    await expect(
      sheet.getByRole('checkbox', { name: humanize(roleName), exact: true }),
    ).toBeVisible();
    await sheet.getByRole('button', { name: 'Close' }).click();

    // assign it to a seed user through the edit modal. Wait until the filtered
    // refetch really landed (exactly one data row) before clicking — the search
    // is debounced 400 ms, and clicking "Edit" against the pre-filter DOM opens
    // the wrong user when leftover rows are still rendered.
    await page.getByPlaceholder('Search users…').fill('user@nuxion.test');
    const row = page.getByRole('row', { name: /user@nuxion\.test/i });
    await expect(row).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(2); // header + the one match
    await row.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Edit user')).toBeVisible();
    await dialog.getByRole('checkbox', { name: humanize(roleName), exact: true }).click();
    await dialog.getByRole('button', { name: /save changes/i }).click();

    // the row now carries the custom role badge
    await expect(row.getByText(humanize(roleName), { exact: true })).toBeVisible();
  });
});
