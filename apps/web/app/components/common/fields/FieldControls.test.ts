import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useForm } from 'vee-validate';
import { describe, expect, it } from 'vitest';
import Fieldset from './Fieldset.vue';
import Checkbox from '../../ui/Checkbox.vue';
import CheckboxField from './CheckboxField.vue';
import SwitchField from './SwitchField.vue';
import SliderField from './SliderField.vue';
import RadioGroupField from './RadioGroupField.vue';
import TagInputField from './TagInputField.vue';

describe('field validation accessibility', () => {
  for (const [component, selector, props, initialValue] of [
    [CheckboxField, '[role="checkbox"]', {}, false],
    [SwitchField, '[role="switch"]', {}, false],
    [SliderField, '[role="slider"]', {}, 20],
    [RadioGroupField, '[role="radio"]', { options: [{ label: 'One', value: 'one' }] }, 'one'],
    [TagInputField, 'input:not([type="hidden"])', {}, []],
  ] as const) {
    it(`${component.__name} links the focus target to its changing field error`, async () => {
      let form!: ReturnType<typeof useForm>;
      const host = defineComponent({
        setup() {
          form = useForm({ initialValues: { control: initialValue } });
          return () =>
            h(component, { name: 'control', label: 'Control', hint: 'Helpful hint', ...props });
        },
      });
      const wrapper = mount(host, {
        global: { components: { Fieldset, Checkbox }, stubs: { MaterialSymbol: true } },
      });
      await nextTick();
      form.setFieldError('control', 'A field error');
      await nextTick();
      const target = wrapper.get(selector);
      expect(target.attributes('aria-describedby')).toBe('control-error');
      expect(target.attributes('aria-invalid')).toBe('true');
      expect(wrapper.get('#control-error').text()).toBe('A field error');
      if (component === TagInputField)
        expect(wrapper.get('label').attributes('for')).toBe(target.attributes('id'));
      form.setFieldError('control', undefined);
      await nextTick();
      expect(target.attributes('aria-describedby')).toBe('control-hint');
      expect(target.attributes('aria-invalid')).toBe('false');
      expect(wrapper.find('#control-error').exists()).toBe(false);
      wrapper.unmount();
    });
  }
});
