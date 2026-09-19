/**
 * Shared user projections for the auth flow. Kept in a standalone module so
 * AuthService and TwoFactorService can share them without a circular import.
 */

/** A user row with its roles included and secrets (password, TOTP, recovery) omitted. */
export interface UserWithRoles {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  roles: { name: string }[];
}

/** The user object embedded in every session response (login/register/refresh). */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  roles: string[];
  twoFactorEnabled: boolean;
}

export function toSessionUser(user: UserWithRoles): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    roles: user.roles.map((r) => r.name),
    twoFactorEnabled: user.twoFactorEnabled,
  };
}
