// Public API barrel for the `role` feature (features/ imported explicitly).
export { RolesTable } from './components/roles-table';
export { RoleFormModal } from './components/role-form-modal';
export { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from './hooks';
export { roleApi } from './api';
