import { z } from 'zod';
import { UserRole } from '@nuxion/shared-types';

const roleEnum = z.enum([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]);

/** FE-only Zod schema (BE uses class-validator). Mirrors CreateUserDto. */
export const createUserSchema = z.object({
  email: z.string().email('Enter a valid email'),
  name: z.string().min(2, 'Name is too short'),
  password: z.string().min(8, 'At least 8 characters'),
  roles: z.array(roleEnum).min(1, 'Select at least one role'),
});

/** Edit: email is immutable; blank password means "keep current". */
export const editUserSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  password: z.string().min(8, 'At least 8 characters').or(z.literal('')),
  roles: z.array(roleEnum).min(1, 'Select at least one role'),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type UpdateUserValues = { name?: string; password?: string; roles?: string[] };
