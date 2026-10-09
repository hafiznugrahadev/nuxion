import { h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Fieldset from './Fieldset.vue';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';

type SlotProps = { id: string; labelId: string; describedBy?: string; invalid: boolean };

/** Mount helper that renders the control slot like a real consumer would. */
function mountFieldset(props: InstanceType<typeof Fieldset>['$props'], slots = {}) {
  return mount(Fieldset, {
    props,
    slots: {
      default: (props: SlotProps) =>
        h('input', {
          id: props.id,
          'aria-describedby': props.describedBy,
          'aria-invalid': props.invalid,
        }),
      ...slots,
    },
  });
}

describe('Fieldset', () => {
  it('composes shadcn Field primitives with a named group', () => {
    const wrapper = mountFieldset({ name: 'email', label: 'Email', hint: 'Use your work email.' });
    expect(wrapper.findComponent(Field).exists()).toBe(true);
    expect(wrapper.findComponent(FieldLabel).exists()).toBe(true);
    expect(wrapper.findComponent(FieldDescription).exists()).toBe(true);
    expect(wrapper.attributes('data-slot')).toBe('field');
    expect(wrapper.attributes('role')).toBe('group');
    expect(wrapper.attributes('aria-labelledby')).toBe('email-label');
    expect(wrapper.attributes('data-invalid')).toBe('false');
  });

  it('wires label[for] to the control id derived from name', () => {
    const wrapper = mountFieldset({ name: 'email', label: 'Email' });
    const label = wrapper.find('label');
    expect(label.attributes('for')).toBe('email');
    expect(label.attributes('id')).toBe('email-label');
    expect(wrapper.find('input').attributes('id')).toBe('email');
  });

  it('marks the caption as required with an asterisk', () => {
    const wrapper = mountFieldset({ name: 'email', label: 'Email', required: true });
    expect(wrapper.find('label').text()).toContain('*');
  });

  it('renders no caption when label and label slot are absent', () => {
    const wrapper = mountFieldset({ name: 'email' });
    expect(wrapper.find('label').exists()).toBe(false);
    expect(wrapper.find('span.text-sm').exists()).toBe(false);
    expect(wrapper.attributes('aria-labelledby')).toBeUndefined();
  });

  it('shows the error instead of the hint and exposes it to the control', () => {
    const wrapper = mountFieldset({
      name: 'email',
      label: 'Email',
      error: 'Invalid email',
      hint: 'We only use it to sign you in.',
    });
    const message = wrapper.find('#email-error');
    expect(message.exists()).toBe(true);
    expect(message.text()).toBe('Invalid email');
    expect(wrapper.findComponent(FieldError).exists()).toBe(true);
    expect(message.attributes('role')).toBe('alert');
    expect(wrapper.attributes('data-invalid')).toBe('true');
    expect(wrapper.find('#email-hint').exists()).toBe(false);
    const input = wrapper.find('input');
    expect(input.attributes('aria-describedby')).toBe('email-error');
    expect(input.attributes('aria-invalid')).toBe('true');
  });

  it('shows the hint when there is no error and describes the control with it', () => {
    const wrapper = mountFieldset({ name: 'email', label: 'Email', hint: 'A quiet hint.' });
    expect(wrapper.find('#email-hint').text()).toBe('A quiet hint.');
    expect(wrapper.find('input').attributes('aria-describedby')).toBe('email-hint');
    // Vue renders aria attributes as strings, so a valid control is explicitly
    // aria-invalid="false" (never dropped from the DOM).
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('false');
  });

  it('renders a span caption (no for) in group mode', () => {
    const wrapper = mountFieldset({
      name: 'roles',
      label: 'Roles',
      group: true,
      error: 'Pick one',
    });
    const caption = wrapper.find('#roles-label');
    expect(caption.element.tagName).toBe('SPAN');
    expect(caption.attributes('for')).toBeUndefined();
    expect(caption.attributes('data-slot')).toBe('field-label');
    expect(wrapper.attributes('aria-labelledby')).toBe('roles-label');
    expect(wrapper.find('#roles-error').exists()).toBe(true);
  });

  it('falls back to a generated id that still matches label[for]', () => {
    const wrapper = mountFieldset({ label: 'Standalone control' });
    const forAttr = wrapper.find('label').attributes('for');
    expect(forAttr).toBeTruthy();
    expect(wrapper.find('input').attributes('id')).toBe(forAttr);
  });

  it('renders the trailing slot on the message row (character counter)', () => {
    const wrapper = mountFieldset(
      { name: 'bio', label: 'Bio', hint: 'Short intro.' },
      { trailing: () => h('span', { class: 'tabular-nums' }, '0/200') },
    );
    const row = wrapper.find('.flex.justify-between');
    expect(row.exists()).toBe(true);
    expect(row.find('#bio-hint').exists()).toBe(true);
    expect(row.find('span.tabular-nums').text()).toBe('0/200');
  });

  it('updates message ids and invalid state as validation changes', async () => {
    const wrapper = mountFieldset({ name: 'email', label: 'Email', hint: 'Use your work email.' });
    await wrapper.setProps({ error: 'Invalid email' });
    expect(wrapper.find('#email-hint').exists()).toBe(false);
    expect(wrapper.find('#email-error').text()).toBe('Invalid email');
    expect(wrapper.find('input').attributes('aria-describedby')).toBe('email-error');
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true');
    expect(wrapper.attributes('data-invalid')).toBe('true');

    await wrapper.setProps({ error: '' });
    expect(wrapper.find('#email-error').exists()).toBe(false);
    expect(wrapper.find('#email-hint').text()).toBe('Use your work email.');
    expect(wrapper.find('input').attributes('aria-describedby')).toBe('email-hint');
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('false');
    expect(wrapper.attributes('data-invalid')).toBe('false');

    await wrapper.setProps({ hint: undefined });
    expect(wrapper.find('input').attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.find('[data-slot="field-description"]').exists()).toBe(false);
  });

  it('uses a custom label slot for the caption and group accessible name', () => {
    const wrapper = mountFieldset(
      { name: 'email', label: 'Fallback', required: true },
      { label: () => h('strong', 'Work email') },
    );
    expect(wrapper.find('label strong').text()).toBe('Work email');
    expect(wrapper.find('label').text()).not.toContain('Fallback');
    expect(wrapper.find('label').text()).toContain('*');
    expect(wrapper.attributes('aria-labelledby')).toBe('email-label');
  });

  it('keeps a trailing-only message row without dangling descriptions', () => {
    const wrapper = mountFieldset({ name: 'bio' }, { trailing: () => h('span', '0/200') });
    expect(wrapper.find('.flex.justify-between').text()).toBe('0/200');
    expect(wrapper.find('input').attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.find('[data-slot="field-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-slot="field-description"]').exists()).toBe(false);
  });
});
