import { Badge as AstryxBadge } from '@astryxdesign/core';
import type { ComponentProps } from 'react';

/*
 * Thin adaptor over the Astryx Badge. The MD3-era variant names keep working:
 * role/status names map onto the system variants, the neutral tint absorbs
 * the tonal greys. Badges carry counts and short labels only (standing
 * convention: counts and statuses, never sentences).
 */

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'muted'
  | 'success'
  | 'warning'
  | 'info';

const VARIANT: Record<BadgeVariant, 'neutral' | 'cyan' | 'error' | 'success' | 'warning' | 'info'> = {
  default: 'neutral',
  // Role badges: cyan keeps the second role visually distinct from neutral.
  secondary: 'cyan',
  destructive: 'error',
  outline: 'neutral',
  muted: 'neutral',
  success: 'success',
  warning: 'warning',
  info: 'info',
};

export interface BadgeProps extends Omit<ComponentProps<'span'>, 'children'> {
  variant?: BadgeVariant;
  children?: React.ReactNode;
}

export function Badge({ variant = 'default', children, ...props }: BadgeProps) {
  return (
    <AstryxBadge label={children} variant={VARIANT[variant]} {...(props as Record<string, unknown>)} />
  );
}
