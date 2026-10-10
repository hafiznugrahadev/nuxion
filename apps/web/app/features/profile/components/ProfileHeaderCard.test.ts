import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fieldset from '~/components/common/fields/Fieldset.vue';
import ProfileHeaderCard from './ProfileHeaderCard.vue';

const { uploadFile, mutateAsync } = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  mutateAsync: vi.fn(),
}));
vi.mock('~/composables/useUpload', () => ({ useUpload: () => ({ uploadFile }) }));
vi.mock('../composables/useProfile', () => ({ useUpdateProfile: () => ({ mutateAsync }) }));
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }));

const t = (key: string) => key;
const user = { id: '1', name: 'Ada', email: 'ada@example.test', roles: ['USER'] };

function renderPicker() {
  return mount(ProfileHeaderCard, {
    props: { user: user as never },
    global: {
      mocks: { $t: t },
      components: { Fieldset },
      stubs: { AppIcon: true, Badge: true },
    },
  });
}

async function pick(wrapper: ReturnType<typeof renderPicker>, file: File) {
  const input = wrapper.get('input');
  Object.defineProperty(input.element, 'files', { configurable: true, value: [file] });
  await input.trigger('change');
  await flushPromises();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('useI18n', () => ({ t }));
  uploadFile.mockResolvedValue({ url: 'https://example.test/avatar.png' });
  mutateAsync.mockResolvedValue({});
});
afterEach(() => vi.unstubAllGlobals());

describe('Profile avatar field errors', () => {
  it('binds an invalid selection inline and clears it after a valid selection', async () => {
    const wrapper = renderPicker();
    await pick(wrapper, new File(['text'], 'note.txt', { type: 'text/plain' }));
    expect(wrapper.get('#profile-avatar-error').text()).toBe('profile.avatar.notImage');
    expect(wrapper.get('input').attributes('aria-describedby')).toBe('profile-avatar-error');
    expect(wrapper.get('button').attributes('aria-invalid')).toBe('true');
    expect(uploadFile).not.toHaveBeenCalled();
    await pick(wrapper, new File(['image'], 'avatar.png', { type: 'image/png' }));
    expect(wrapper.find('#profile-avatar-error').exists()).toBe(false);
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('false');
    expect(mutateAsync).toHaveBeenCalledWith({ avatarUrl: 'https://example.test/avatar.png' });
  });

  it('keeps upload and profile save failures beside the picker', async () => {
    const wrapper = renderPicker();
    uploadFile.mockRejectedValueOnce({
      message: 'HTTP 400',
      data: { fieldErrors: { file: ['Image MIME type is not allowed'] } },
    });
    await pick(wrapper, new File(['image'], 'avatar.png', { type: 'image/png' }));
    expect(wrapper.get('#profile-avatar-error').text()).toBe('Image MIME type is not allowed');
    mutateAsync.mockRejectedValueOnce({
      data: { fieldErrors: { avatarUrl: ['Could not save photo'] } },
    });
    await pick(wrapper, new File(['image'], 'avatar.png', { type: 'image/png' }));
    expect(wrapper.get('#profile-avatar-error').text()).toBe('Could not save photo');
    expect(wrapper.get('button').attributes('aria-describedby')).toBe('profile-avatar-error');
  });
});
