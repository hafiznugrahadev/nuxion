import { z } from 'zod';

/** UPPER_SNAKE_CASE, mirroring the seeded SUPER_ADMIN/ADMIN/USER names. */
const roleNamePattern = /^[A-Z][A-Z0-9_]*$/;

/**
 * FE-only Zod schema (BE uses class-validator), built per-locale so validation
 * messages localize like every other user-visible string. Mirrors
 * CreateRoleDto/UpdateRoleDto (name only).
 */
export function createRoleSchema(t: (key: string) => string) {
  return z.object({
    name: z
      .string()
      .min(2, t('roles.form.errors.tooShort'))
      .max(50, t('roles.form.errors.tooLong'))
      .regex(roleNamePattern, t('roles.form.errors.pattern')),
  });
}

export type RoleFormValues = z.infer<ReturnType<typeof createRoleSchema>>;
