import { describe, expect, it } from 'vitest';
import { getNextComboboxPage } from './useComboboxQuery';

describe('remote combobox pagination', () => {
  it('requests another page only when the result count allows it', () => {
    expect(
      getNextComboboxPage({
        data: [],
        meta: { page: 1, limit: 25, total: 60, totalPages: 3 },
      }),
    ).toBe(2);
    expect(
      getNextComboboxPage({
        data: [],
        meta: { page: 3, limit: 25, total: 60, totalPages: 3 },
      }),
    ).toBeUndefined();
  });
});
