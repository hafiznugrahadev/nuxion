import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { clearSession, setSession } from '@/lib/auth-store';
import { renderJsx } from '@/lib/test-render';
import { AdminGuard } from './admin-guard';
import { TwoFactorSetup } from './two-factor-setup';

const { router, searchParams, setup } = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  searchParams: new URLSearchParams(),
  setup: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/lib/auth-api', () => ({
  ensureSession: async () => true,
  logout: vi.fn(),
  TWO_FACTOR_ENABLED: false,
}));
vi.mock('@/features/security', () => ({ securityApi: { twoFactorSetup: setup } }));
vi.mock('@/components/common/brand-logo', () => ({ BrandLogo: () => null }));
vi.mock('@/components/common/brand-name', () => ({ BrandName: () => null }));
vi.mock('@/components/common/text-field', () => ({ TextField: () => <input name="code" /> }));
vi.mock('@/components/blocks/states', () => ({ LoadingState: () => null }));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

beforeEach(() => {
  router.replace.mockReset();
  setup.mockReset();
  window.history.replaceState({}, '', '/admin/profile');
  setSession({
    accessToken: 'pending',
    user: { id: 'A', roles: ['USER'], twoFactorEnabled: false } as never,
    enrollmentRequired: true,
  });
});
afterEach(() => clearSession());

describe('server-required enrollment with public flag disabled', () => {
  it('redirects the protected app to enrollment', async () => {
    const { host, unmount } = renderJsx(
      <AdminGuard>
        <p>private content</p>
      </AdminGuard>,
    );
    try {
      await act(async () => {
        await Promise.resolve();
      });
      await vi.waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith(
          '/two-factor/setup?redirect=%2Fadmin%2Fprofile',
        ),
      );
      expect(host.textContent).not.toContain('private content');
    } finally {
      unmount();
    }
  });
  it('loads the setup challenge and permits entering the code', async () => {
    setup.mockResolvedValue({ qrDataUrl: 'data:image/png;base64,AA==', secret: 'DUMMY' });
    const { host, unmount } = renderJsx(<TwoFactorSetup />);
    try {
      await act(async () => {
        await Promise.resolve();
      });
      await vi.waitFor(() => expect(host.querySelector('input[name="code"]')).not.toBeNull());
      expect(setup).toHaveBeenCalledOnce();
      expect(router.replace).not.toHaveBeenCalled();
    } finally {
      unmount();
    }
  });
  it('allows a user-verified passkey session without registered TOTP', async () => {
    setSession({
      accessToken: 'full',
      user: { id: 'A', roles: ['USER'], twoFactorEnabled: false } as never,
      enrollmentRequired: false,
    });
    const { host, unmount } = renderJsx(
      <AdminGuard>
        <p>private content</p>
      </AdminGuard>,
    );
    try {
      await act(async () => {
        await Promise.resolve();
      });
      await vi.waitFor(() => expect(host.textContent).toContain('private content'));
      expect(router.replace).not.toHaveBeenCalled();
    } finally {
      unmount();
    }
  });
});
