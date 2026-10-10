// Public API barrel for the `user` feature (features/ imported explicitly).
export { UsersTable } from './components/users-table';
export { UserFormModal } from './components/user-form-modal';
export { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from './hooks';
export { userApi } from './api';
export type { UserListParams } from './types';
