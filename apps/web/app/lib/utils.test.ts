import { describe, expect, it } from 'vitest';
import { cn, formatIDR } from './utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('dedupes conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('drops falsy values', () => {
    expect(cn('a', null, undefined, false, 'c')).toBe('a c');
  });
});

describe('formatIDR', () => {
  it('formats whole rupiah without decimals', () => {
    // Tolerate the optional (non-breaking) space between symbol and amount.
    expect(formatIDR(150000)).toMatch(/^Rp\s?150\.000$/);
  });
});
