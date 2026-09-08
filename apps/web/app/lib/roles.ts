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

export function roleLabel(role: string, t: (key: string) => string): string {
  const known = KNOWN[role];
  return known ? t(`users.roles.${known}`) : role.replaceAll('_', ' ').toLowerCase();
}
