import { computed, defineComponent, h, ref } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SecuritySection from './security/components/SecuritySection.vue';
import ChangePasswordCard from './profile/components/ChangePasswordCard.vue';
import UserFormModal from './user/components/UserFormModal.vue';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  regenerate: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  values: {} as Record<string, unknown>,
}));
vi.mock('vee-validate', async () => {
  const { ref } = await import('vue');
  return {
    useForm: () => ({
      handleSubmit: (callback: (values: unknown) => unknown) => (event: Event) => {
        event.preventDefault();
        return callback(mocks.values);
      },
      resetForm: vi.fn(),
      errors: {},
      setErrors: vi.fn(),
    }),
    useField: () => ({ value: ref([]) }),
  };
});
vi.mock('@tanstack/vue-query', () => ({
  useQuery: () => ({}),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('~/composables/useConfirm', () => ({ useConfirm: () => ({ confirm: mocks.confirm }) }));
vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({ user: { twoFactorEnabled: true }, isAuthenticated: true }),
}));
vi.mock('./security/api/security.api', () => ({
  useSecurityApi: () => ({ regenerateRecoveryCodes: mocks.regenerate }),
}));
vi.mock('./user/composables/useUsers', async () => {
  const { ref } = await import('vue');
  return {
    useCreateUser: () => ({ isPending: ref(false), mutateAsync: mocks.create }),
    useUpdateUser: () => ({ isPending: ref(false), mutateAsync: mocks.update }),
  };
});
vi.mock('./profile/composables/useProfile', async () => {
  const { ref } = await import('vue');
  return { useChangePassword: () => ({ isPending: ref(false), mutateAsync: mocks.update }) };
});
vi.mock('~/features/role', async () => {
  const { ref } = await import('vue');
  return {
    useRoles: () => ({
      data: ref([
        { name: 'USER' },
        { name: 'CONTENT_EDITOR' },
        { name: 'ADMIN' },
        { name: 'SUPER_ADMIN' },
      ]),
    }),
  };
});
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const Modal = defineComponent({
  props: ['open'],
  setup:
    (props, { slots }) =>
    () =>
      props.open ? h('section', slots.default?.()) : null,
});
const Button = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h('button', slots.default?.()),
});
let wrapper: VueWrapper;
const global = {
  mocks: { $t: (key: string) => key },
  stubs: {
    Modal,
    Button,
    Fieldset: defineComponent({
      setup:
        (_, { slots }) =>
        () =>
          h('div', slots.default?.({ id: 'field', invalid: false })),
    }),
    Checkbox: true,
    PasswordField: true,
    AppIcon: true,
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }));
  vi.stubGlobal('useConfirm', () => ({ confirm: mocks.confirm }));
  vi.stubGlobal('useRuntimeConfig', () => ({
    public: { twoFactorEnabled: true, passkeyEnabled: false },
  }));
  vi.stubGlobal('ref', ref);
  vi.stubGlobal('computed', computed);
  mocks.confirm.mockResolvedValue(false);
  mocks.regenerate.mockResolvedValue(['NEW-CODE']);
  mocks.update.mockResolvedValue({});
});
afterEach(() => {
  wrapper?.unmount();
  vi.unstubAllGlobals();
});

describe('recovery codes', () => {
  async function submit() {
    mocks.values = { password: 'current-password' };
    wrapper = mount(SecuritySection, { global });
    await wrapper.get('[data-testid="regenerate-recovery-button"]').trigger('click');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
  }
  it('does not invalidate codes when confirmation is cancelled', async () => {
    await submit();
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ destructive: true, confirmText: 'security.recovery.regenerate' }),
    );
    expect(mocks.regenerate).not.toHaveBeenCalled();
    expect(wrapper.find('form').exists()).toBe(true);
  });
  it('submits the password and shows the new codes after confirmation', async () => {
    mocks.confirm.mockResolvedValue(true);
    await submit();
    expect(mocks.regenerate).toHaveBeenCalledExactlyOnceWith('current-password');
    expect(wrapper.text()).toContain('NEW-CODE');
  });
});

describe('user account access', () => {
  async function submit(values: Record<string, unknown>, heldRoles = ['USER']) {
    mocks.values = values;
    wrapper = mount(UserFormModal, {
      props: {
        open: true,
        user: { id: 'user-1', name: 'User', email: 'user@example.com', roles: heldRoles } as never,
      },
      global,
    });
    expect(wrapper.text()).toContain('content editor');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
  }
  it.each([
    { name: 'User', roles: ['ADMIN'], password: '' },
    { name: 'User', roles: ['USER'], password: 'new-password' },
  ])('does not change access on cancellation: %j', async (values) => {
    await submit(values);
    expect(mocks.confirm).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(wrapper.emitted('saved')).toBeUndefined();
  });
  it('saves confirmed security changes', async () => {
    mocks.confirm.mockResolvedValue(true);
    await submit({ name: 'User', roles: ['ADMIN'], password: 'new-password' });
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({
      id: 'user-1',
      body: { name: 'User', roles: ['ADMIN'], password: 'new-password' },
    });
  });
  it('preserves an unchanged custom role without confirming and lists catalog roles', async () => {
    await submit({ name: 'User', roles: ['CONTENT_EDITOR'], password: '' }, ['CONTENT_EDITOR']);
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it('saves name-only edits without a security confirmation', async () => {
    await submit({ name: 'New name', roles: ['USER'], password: '' });
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledOnce();
  });
});

describe('own password replacement', () => {
  it.each([false, true])('requires explicit confirmation: %s', async (accepted) => {
    mocks.confirm.mockResolvedValue(accepted);
    mocks.values = {
      currentPassword: 'current-password',
      newPassword: 'new-password',
      confirmPassword: 'new-password',
    };
    wrapper = mount(ChangePasswordCard, { global });
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ destructive: true, confirmText: 'profile.changePassword.update' }),
    );
    expect(mocks.update).toHaveBeenCalledTimes(accepted ? 1 : 0);
  });
});

describe('privileged account creation', () => {
  it.each([
    ['ADMIN', false],
    ['ADMIN', true],
    ['SUPER_ADMIN', false],
    ['SUPER_ADMIN', true],
    ['USER', true],
  ])('gates role %s with accepted=%s', async (role, accepted) => {
    mocks.confirm.mockResolvedValue(accepted);
    mocks.values = {
      name: 'New account',
      email: 'new@example.com',
      roles: [role],
      password: 'new-password',
    };
    wrapper = mount(UserFormModal, { props: { open: true }, global });
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.confirm).toHaveBeenCalledTimes(role === 'USER' ? 0 : 1);
    expect(mocks.create).toHaveBeenCalledTimes(role === 'USER' || accepted ? 1 : 0);
  });
});
