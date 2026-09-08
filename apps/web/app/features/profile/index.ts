// Public API barrel for the `profile` feature (SPEC: features/ imported explicitly).
export { default as ProfileHeaderCard } from './components/ProfileHeaderCard.vue';
export { default as PersonalInfoCard } from './components/PersonalInfoCard.vue';
export { default as ChangePasswordCard } from './components/ChangePasswordCard.vue';
export { useMe, useUpdateProfile, useChangePassword } from './composables/useProfile';
export { useProfileApi } from './api/profile.api';
export type { UpdateProfileInput, ChangePasswordInput } from './types';
