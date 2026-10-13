import { Button as AstryxButton, IconButton } from '@astryxdesign/core';
import { isValidElement, type ComponentProps, type ElementType, type ReactNode } from 'react';

/*
 * Thin adaptor over the Astryx Button (the design system renders structure,
 * states, focus and motion). The MD3-era surface keeps working: variant and
 * size names, native button props, className, and the icon size. The former
 * asChild pattern is replaced by the Astryx link mode (href / as / target /
 * rel) — see the call sites migrated with this change.
 */

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

/** MD3 emphasis names mapped onto the system variants. */
const VARIANT: Record<ButtonVariant, 'primary' | 'secondary' | 'ghost' | 'destructive'> = {
  default: 'primary',
  destructive: 'destructive',
  // The MD3 outlined button is the low-emphasis tier; the system's secondary
  // (tonal) fills that role. `link` was never used and collapses onto ghost.
  outline: 'secondary',
  secondary: 'secondary',
  ghost: 'ghost',
  link: 'ghost',
};

const SIZE = { default: 'md', sm: 'sm', lg: 'lg' } as const;

/** Visible text of a children tree, so JSX children still yield a label. */
function childText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(childText).join('');
  if (isValidElement(node)) return childText((node.props as { children?: ReactNode }).children);
  return '';
}

export interface ButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
  /** Link mode (replaces the former asChild + Link/anchor pattern). */
  href?: string;
  as?: ElementType;
  target?: string;
  rel?: string;
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  children,
  disabled,
  href,
  as,
  target,
  rel,
  ...props
}: ButtonProps) {
  const astryxVariant = VARIANT[variant];
  const label = (props['aria-label'] as string | undefined) ?? childText(children).trim();
  const rest = props as Record<string, unknown>;
  const linkProps = { href, as, target, rel };

  if (size === 'icon') {
    return (
      <IconButton
        icon={children}
        label={label}
        variant={astryxVariant}
        className={className}
        isDisabled={disabled}
        {...linkProps}
        {...rest}
      />
    );
  }

  return (
    <AstryxButton
      label={label}
      variant={astryxVariant}
      size={SIZE[size]}
      className={className}
      isDisabled={disabled}
      {...linkProps}
      {...rest}
    >
      {children}
    </AstryxButton>
  );
}
