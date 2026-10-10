import { describe, expect, it } from 'vitest';
import { Field } from '@/components/common/field';
import { renderJsx } from '../../lib/test-render';

describe('Field', () => {
  it('wires label↔control through htmlFor/id', () => {
    const { host, unmount } = renderJsx(
      <Field label="Email">{({ id }) => <input id={id} data-testid="ctl" />}</Field>,
    );
    const label = host.querySelector('label') as HTMLLabelElement;
    const input = host.querySelector('[data-testid="ctl"]') as HTMLInputElement;
    expect(label.htmlFor).toBe(input.id);
    unmount();
  });

  it('error renders as role=alert and feeds describedBy + invalid to the control', () => {
    const { host, unmount } = renderJsx(
      <Field label="Email" error="Enter a valid email">
        {({ describedBy, invalid }) => (
          <input aria-describedby={describedBy} aria-invalid={invalid} data-testid="ctl" />
        )}
      </Field>,
    );
    const alert = host.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toBe('Enter a valid email');
    const input = host.querySelector('[data-testid="ctl"]') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    unmount();
  });

  it('hint takes over describedBy when there is no error, error wins when both', () => {
    const hintOnly = renderJsx(
      <Field label="X" hint="keep it short">
        {({ describedBy, invalid }) => (
          <input aria-describedby={describedBy} aria-invalid={invalid} data-testid="ctl" />
        )}
      </Field>,
    );
    const input1 = hintOnly.host.querySelector('[data-testid="ctl"]') as HTMLInputElement;
    expect(input1.getAttribute('aria-describedby')).toBeTruthy();
    expect(input1.getAttribute('aria-invalid')).toBe('false');
    expect(hintOnly.host.querySelector('[role="alert"]')).toBeNull();
    hintOnly.unmount();

    const both = renderJsx(
      <Field label="X" hint="keep it short" error="bad">
        {({ describedBy }) => <input aria-describedby={describedBy} data-testid="ctl" />}
      </Field>,
    );
    const input2 = both.host.querySelector('[data-testid="ctl"]') as HTMLInputElement;
    expect(input2.getAttribute('aria-describedby')).toContain('error');
    expect(both.host.textContent).not.toContain('keep it short');
    both.unmount();
  });

  it('renders the required marker visually without polluting label text', () => {
    const { host, unmount } = renderJsx(
      <Field label="Name" required>
        {({ id }) => <input id={id} />}
      </Field>,
    );
    const label = host.querySelector('label') as HTMLLabelElement;
    // The star comes from CSS ::after — the text content stays clean.
    expect(label.textContent).toBe('Name');
    expect(label.className).toContain('after:content');
    unmount();
  });
});
