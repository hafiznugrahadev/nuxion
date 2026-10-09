// Public API barrel for the `role` feature (SPEC: features/ imported explicitly).
export { default as RoleTable } from './components/RoleTable.vue';
export { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from './composables/useRoles';
export { useRoleApi } from './api/role.api';
export type { Role } from './types';
