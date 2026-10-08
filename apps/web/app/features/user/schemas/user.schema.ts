import { z } from 'zod';

/**
 * Plain strings, not a fixed enum: the API's role catalog is data and custom
 * roles are assignable. The form constrains choices to catalog checkboxes;
 * the server 404s on names it does not know.
 */
const roleNames = z.array(z.string()).min(1, 'Select at least one role');

/** FE-only Zod schema (BE uses class-validator). Mirrors CreateUserDto. */
export const createUserSchema = z.object({
  email: z.string().email('Enter a valid email'),
  name: z.string().min(2, 'Name is too short'),
  password: z.string().min(8, 'At least 8 characters'),
  roles: roleNames,
});

/** Edit: email is immutable; blank password means "keep current". */
export const editUserSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  password: z.string().min(8, 'At least 8 characters').or(z.literal('')),
  roles: roleNames,
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type UpdateUserValues = { name?: string; password?: string; roles?: string[] };
