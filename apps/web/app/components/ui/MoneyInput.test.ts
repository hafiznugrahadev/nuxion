import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MoneyInput from './MoneyInput.vue';

describe('MoneyInput', () => {
  it('keeps numeric model values while formatting the blurred display', async () => {
    const host = defineComponent({
      setup() {
        const value = ref<number | null>(null);
        return () =>
          h(MoneyInput, {
            modelValue: value.value,
            'onUpdate:modelValue': (v) => (value.value = v),
          });
      },
    });
    const wrapper = mount(host);
    const input = wrapper.get('input');
    await input.trigger('focus');
    await input.setValue('1250000,5');
    expect((input.element as HTMLInputElement).value).toBe('1250000,5');
    await input.trigger('blur');
    expect((input.element as HTMLInputElement).value).toBe('Rp\u00a01.250.000,50');
    wrapper.unmount();
  });

  it('preserves empty values and applies configured bounds', async () => {
    const wrapper = mount(MoneyInput, { props: { min: 0, max: 100 } });
    const input = wrapper.get('input');
    await input.trigger('focus');
    await input.setValue('-5');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe(0);
    await input.setValue('');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBeNull();
    wrapper.unmount();
  });
});
