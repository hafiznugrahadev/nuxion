import { describe, expect, it } from 'vitest';
import { createRoleSchema } from './schemas';

const t = (key: string) => `→${key}`;

describe('createRoleSchema', () => {
  it('accepts UPPER_SNAKE_CASE names', () => {
    expect(createRoleSchema(t).safeParse({ name: 'CONTENT_EDITOR' }).success).toBe(true);
    expect(createRoleSchema(t).safeParse({ name: 'A1_B2' }).success).toBe(true);
  });

  it('rejects lowercase, leading digit/underscore, and spaces', () => {
    for (const name of ['editor', '_X', '9LIVES', 'TWO WORDS']) {
      expect(createRoleSchema(t).safeParse({ name }).success).toBe(false);
    }
  });

  it('enforces the 2–50 length with localized messages', () => {
    const out = createRoleSchema(t).safeParse({ name: 'A' });
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.error.issues[0]!.message).toContain('roles.form.errors');
    }
  });
});
