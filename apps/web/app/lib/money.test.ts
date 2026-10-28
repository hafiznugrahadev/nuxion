import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyEdit, parseMoneyInput } from './money';

describe('money helpers', () => {
  it('formats IDR with the agreed two decimal places', () => {
    expect(formatMoney(1250000.5)).toBe('Rp\u00a01.250.000,50');
  });

  it('parses localized decimal and grouping separators', () => {
    expect(parseMoneyInput('1.250.000,50')).toBe(1250000.5);
    expect(parseMoneyInput('1,250,000.50', 'en-US')).toBe(1250000.5);
    expect(parseMoneyInput('')).toBeNull();
  });

  it('creates a grouping-free editable value', () => {
    expect(formatMoneyEdit(1250000.5)).toBe('1250000,5');
  });
});
