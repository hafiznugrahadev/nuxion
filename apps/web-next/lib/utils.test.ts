import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges conditional classes', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });

  it('lets the later Tailwind utility win a conflict', () => {
    expect(cn('h-10 w-10', 'w-12')).toBe('h-10 w-12');
  });
});
