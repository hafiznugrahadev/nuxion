import { Card as AstryxCard } from '@astryxdesign/core';
import type { HTMLAttributes } from 'react';

/*
 * Thin adaptor over the Astryx Card. Padding stays under call-site control
 * (the system default is zeroed here, matching the previous contract where
 * consumers add their own p-* utilities).
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <AstryxCard
      padding={0}
      className={className}
      {...(props as Record<string, unknown>)}
    />
  );
}
