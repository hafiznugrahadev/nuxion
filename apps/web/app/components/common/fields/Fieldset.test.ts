import { h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Fieldset from './Fieldset.vue';

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
  it('restores the hint and control description after a field error clears', async () => {
    const wrapper = mountFieldset({ name: 'email', label: 'Email', hint: 'Use your work email.' });
    await wrapper.setProps({ error: 'Email is required' });
    expect(wrapper.find('input').attributes('aria-describedby')).toBe('email-error');
    expect(wrapper.find('#email-hint').exists()).toBe(false);
    await wrapper.setProps({ error: undefined });
    expect(wrapper.find('#email-error').exists()).toBe(false);
    expect(wrapper.find('#email-hint').text()).toBe('Use your work email.');
    expect(wrapper.find('input').attributes('aria-describedby')).toBe('email-hint');
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('false');
  });

  it('keeps inline boolean captions linked to the control before them', () => {
    const wrapper = mountFieldset({
      name: 'enabled',
      label: 'Enabled',
      inline: true,
      error: 'Required',
    });
    const row = wrapper.find('.items-center');
    expect(row.element.children[0]?.tagName).toBe('INPUT');
    expect(row.find('label').attributes('for')).toBe('enabled');
    expect(row.find('input').attributes('aria-describedby')).toBe('enabled-error');
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
});
