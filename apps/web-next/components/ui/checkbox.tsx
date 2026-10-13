'use client';

import { CheckboxInput } from '@astryxdesign/core';
import type { InputHTMLAttributes, Ref } from 'react';

/*
 * Thin adaptor over the Astryx CheckboxInput. Call sites keep their native
 * prop contract (id/checked/onChange) and their own external <label htmlFor>,
 * which stays the checkbox's only name: the system label is hidden and empty
 * so it contributes nothing to the accessible name.
 */
export function Checkbox({
  className,
  checked,
  defaultChecked,
  onChange,
  disabled,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <CheckboxInput
      label=""
      isLabelHidden
      value={checked ?? defaultChecked ?? false}
      onChange={
        onChange
          ? (next: boolean) => onChange({ target: { checked: next } } as never)
          : undefined
      }
      isDisabled={disabled}
      id={id}
      className={className}
      {...(props as Record<string, unknown>)}
    />
  );
}
