/**
 * Map a role enum value (as stored/transported, e.g. `SUPER_ADMIN`) to a
 * human label. Known roles localize through `users.roles.*`; anything else
 * (custom rows in the roles table) falls back to the name with underscores
 * as spaces — raw enum values never leak into the UI.
 */
const KNOWN: Record<string, string> = {
  SUPER_ADMIN: 'superAdmin',
  ADMIN: 'admin',
  USER: 'user',
};

/** The roles the code itself depends on (`@Roles` guards, registration flow).
 *  The API refuses to rename or delete them; the UI mirrors that by disabling
 *  the controls so the attempt never happens client-side. */
export function isWellKnownRole(role: string): boolean {
  return role in KNOWN;
}

export function roleLabel(role: string, t: (key: string) => string): string {
  const known = KNOWN[role];
  return known ? t(`users.roles.${known}`) : role.replaceAll('_', ' ').toLowerCase();
}
