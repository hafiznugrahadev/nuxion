import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@nuxion/shared-types';

export const ROLES_KEY = 'roles';

/** `@Roles('ADMIN')` — restrict a handler to the given roles (enforced by RolesGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
