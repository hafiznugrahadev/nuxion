import { defineComponent, h, nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Fieldset from '../common/fields/Fieldset.vue';
import Editor from './Editor.vue';

vi.mock('~/composables/useUpload', () => ({
  useUpload: () => ({ uploadFile: vi.fn().mockRejectedValue(new Error('Storage unavailable')) }),
}));

afterEach(() => vi.unstubAllGlobals());

function mountEditor(disabled = false) {
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }));
  const error = ref<string>();
  const host = defineComponent({
    setup: () => () =>
      h(
        Fieldset,
        {
          name: 'body',
          label: 'Body',
          hint: 'Write a message.',
          error: error.value,
        },
        {
          default: ({
            id,
            labelId,
            describedBy,
            invalid,
          }: {
            id: string;
            labelId: string;
            describedBy?: string;
            invalid: boolean;
          }) =>
            h(Editor, {
              id,
              disabled,
              'aria-labelledby': labelId,
              'aria-describedby': describedBy,
              'aria-invalid': invalid,
            }),
        },
      ),
  });
  const wrapper = mount(host, {
    global: {
      components: { Fieldset },
      stubs: { ClientOnly: { template: '<slot />' }, AppIcon: true },
    },
  });
  return { wrapper, error };
}

describe('Editor field accessibility', () => {
  it('forwards field attributes to the editing surface and restores its hint', async () => {
    const { wrapper, error } = mountEditor();
    await flushPromises();
    const surface = wrapper.get('[contenteditable="true"]');
    expect(surface.attributes('id')).toBe('body');
    expect(surface.attributes('aria-labelledby')).toBe('body-label');
    expect(surface.attributes('aria-describedby')).toBe('body-hint');
    error.value = 'Body is required';
    await nextTick();
    expect(surface.attributes('aria-invalid')).toBe('true');
    expect(surface.attributes('aria-describedby')).toBe('body-error');
    error.value = undefined;
    await nextTick();
    expect(surface.attributes('aria-invalid')).toBe('false');
    expect(surface.attributes('aria-describedby')).toBe('body-hint');
    expect(wrapper.findAll('#body')).toHaveLength(1);
    wrapper.unmount();
  });

  it('initializes a disabled editing surface as noneditable', async () => {
    const { wrapper } = mountEditor(true);
    await flushPromises();
    expect(wrapper.get('.prose-mirror').attributes('contenteditable')).toBe('false');
    wrapper.unmount();
  });

  it('binds image validation errors to the image picker and visible trigger', async () => {
    const { wrapper } = mountEditor();
    await flushPromises();
    const input = wrapper.get('input[type="file"]');
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [new File(['text'], 'notes.txt', { type: 'text/plain' })],
    });
    await input.trigger('change');
    const errorId = input.attributes('aria-describedby');
    expect(wrapper.get(`[id="${errorId}"]`).text()).toBe('editor.chooseImage');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(
      wrapper.get('button[aria-label="editor.imageLabel"]').attributes('aria-describedby'),
    ).toBe(errorId);
    wrapper.unmount();
  });
});
