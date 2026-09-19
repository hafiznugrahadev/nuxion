// Public API barrel for the `security` feature (SPEC: features/ imported explicitly).
export { useSecurityApi } from './api/security.api';
export { default as SecuritySection } from './components/SecuritySection.vue';
export type { Passkey, TwoFactorActivatePayload, TwoFactorSetupPayload } from './types';
