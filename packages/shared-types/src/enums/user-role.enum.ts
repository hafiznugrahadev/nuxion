/**
 * User roles. Shared between BE (authorization guards) and FE (route guards / UI gating).
 * Kept as a const object + union so it is usable as both a value and a type on the FE
 * without pulling in a runtime enum, while BE re-exports it for class-validator `@IsEnum`.
 */
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
