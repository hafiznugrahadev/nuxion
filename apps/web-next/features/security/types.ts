import type { User } from '@nuxion/shared-types';

export interface TwoFactorSetupPayload {
  qrDataUrl: string;
  secret: string;
}

export interface TwoFactorActivatePayload {
  accessToken: string;
  user: User;
  enrollmentRequired: boolean;
  recoveryCodes: string[];
}

export interface Passkey {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}
