import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password utils', () => {
  it('hashes a password to a non-plaintext value and verifies it', async () => {
    const hash = await hashPassword('s3cret-pw');
    expect(hash).not.toBe('s3cret-pw');
    expect(await verifyPassword('s3cret-pw', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('s3cret-pw');
    expect(await verifyPassword('wrong-pw', hash)).toBe(false);
  });
});
