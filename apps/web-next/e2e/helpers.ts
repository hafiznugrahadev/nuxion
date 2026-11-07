import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const ADMIN = { email: 'admin@nuxion.test', password: 'admin123' } as const;
export const SUPER_ADMIN = { email: 'superadmin@nuxion.test', password: 'super1234' } as const;
// The API publishes no host port — reach it through the OrbStack container
// domain (plain http on the exposed port; undici would reject the self-signed
// https proxy, so the http hop is deliberate).
export const API_BASE = process.env.E2E_API_BASE ?? 'http://api.nuxion-dev.orb.local:8000/api';
export const MAILPIT = process.env.E2E_MAILPIT ?? 'http://mailpit.nuxion-dev.orb.local:8025';

/** APIRequestContext retains the HttpOnly cookie for subsequent API calls. */
export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  const res = await request.post(`${API_BASE}/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).data.user).toBeTruthy();
}

/** Delete a user by email via the API (super-admin) — for idempotent cleanup. */
export async function deleteUserByEmail(request: APIRequestContext, email: string) {
  await apiLogin(request, SUPER_ADMIN.email, SUPER_ADMIN.password);
  const list = await request.get(`${API_BASE}/users?limit=100&search=${encodeURIComponent(email)}`);
  const { data } = await list.json();
  const match = (data ?? []).find((u: { email: string; id: string }) => u.email === email);
  if (match) await request.delete(`${API_BASE}/users/${match.id}`);
}

/** Delete a role by name via the API (super-admin) — for idempotent cleanup.
 *  Built-ins 400; this is only pointed at e2e-created custom roles. */
export async function deleteRoleByName(request: APIRequestContext, name: string) {
  await apiLogin(request, SUPER_ADMIN.email, SUPER_ADMIN.password);
  const list = await request.get(`${API_BASE}/roles`);
  const { data } = await list.json();
  const match = (data ?? []).find((r: { name: string; id: string }) => r.name === name);
  if (match) await request.delete(`${API_BASE}/roles/${match.id}`);
}

/** Wait until React has hydrated (Providers sets data-hydrated on <body>) so
 *  form onSubmit handlers are attached — clicking before hydration triggers a
 *  native GET form submit. */
export async function waitForHydration(page: Page) {
  await page.waitForFunction(() => document.body.dataset.hydrated === 'true');
}

/** Navigate, then wait for hydration before any interaction. */
export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForHydration(page);
}

/** Fill and submit the login form (does not assert the outcome). */
export async function login(page: Page, email = ADMIN.email, password = ADMIN.password) {
  await gotoHydrated(page, '/login');
  await page.getByRole('textbox', { name: /^Email(?:\s*\*)?$/ }).fill(email);
  // Exact — getByLabel('Password') also substring-matches the show/hide toggle.
  await page
    .getByLabel(/^Password(?:\s*\*)?$/)
    .and(page.locator('input'))
    .fill(password);
  // Anchor the name — the social buttons are also "Sign in with …".
  await page.getByRole('button', { name: /^sign in$/i }).click();
}

/** Pull the most recent email's reset TOKEN out of Mailpit. The emailed link
 *  targets the API's APP_URL (the Nuxt variant's origin), so tests re-open it
 *  on THIS variant's origin with the token. */
export async function latestResetToken(request: APIRequestContext): Promise<string> {
  const list = await request.get(`${MAILPIT}/api/v1/messages`);
  expect(list.ok()).toBeTruthy();
  const { messages } = await list.json();
  expect(messages.length).toBeGreaterThan(0);
  const detail = await request.get(`${MAILPIT}/api/v1/message/${messages[0].ID}`);
  const { Text } = await detail.json();
  const match = Text.match(/reset-password\?token=([^\s&]+)/);
  if (!match) throw new Error('No reset token found in the latest email');
  return match[1]!;
}

/** Reset a user's password straight through the API (restores seed state after a test). */
export async function resetPasswordViaApi(
  request: APIRequestContext,
  email: string,
  newPassword: string,
) {
  await request.delete(`${MAILPIT}/api/v1/messages`);
  const forgot = await request.post(`${API_BASE}/auth/forgot-password`, { data: { email } });
  expect(forgot.ok()).toBeTruthy();
  const token = await latestResetToken(request);
  const reset = await request.post(`${API_BASE}/auth/reset-password`, {
    data: { token, newPassword },
  });
  expect(reset.ok()).toBeTruthy();
}
