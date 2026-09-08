// Public API barrel for the `user` feature (SPEC: features/ imported explicitly).
export { default as UserTable } from './components/UserTable.vue';
export { useUsers } from './composables/useUsers';
export { useUserApi } from './api/user.api';
export type { UserListParams } from './types';
