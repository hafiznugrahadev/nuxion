import * as bcrypt from 'bcrypt';

/**
 * Password hashing helpers — single source of truth for both the auth module and
 * the Prisma seed. Uses bcrypt with a sane cost factor (OWASP-recommended >= 10).
 */
const SALT_ROUNDS = 12;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
