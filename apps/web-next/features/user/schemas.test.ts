import { describe, expect, it } from 'vitest';
import { createUserSchema, editUserSchema } from './schemas';

describe('createUserSchema', () => {
  it('accepts a valid payload', () => {
    const out = createUserSchema.safeParse({
      email: 'a@b.co',
      name: 'Ab',
      password: 'longenough',
      roles: ['USER'],
    });
    expect(out.success).toBe(true);
  });

  it('rejects a bad email, short name, short password, and empty roles', () => {
    const out = createUserSchema.safeParse({
      email: 'nope',
      name: 'A',
      password: '123',
      roles: [],
    });
    expect(out.success).toBe(false);
    if (!out.success) {
      const fields = Object.keys(out.error.flatten().fieldErrors);
      expect(fields).toEqual(expect.arrayContaining(['email', 'name', 'password', 'roles']));
    }
  });
});

describe('editUserSchema', () => {
  it('allows a blank password ("keep current") but still validates a filled one', () => {
    const base = { name: 'Ab', roles: ['USER'] };
    expect(editUserSchema.safeParse({ ...base, password: '' }).success).toBe(true);
    expect(editUserSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
    expect(editUserSchema.safeParse({ ...base, password: 'longenough' }).success).toBe(true);
  });

  it('requires at least one role', () => {
    expect(editUserSchema.safeParse({ name: 'Ab', password: '', roles: [] }).success).toBe(false);
  });
});
