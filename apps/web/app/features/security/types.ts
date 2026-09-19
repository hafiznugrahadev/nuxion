import type { User } from '@nuxion/shared-types';

/** What POST /auth/2fa/setup returns — shown as a QR code + manual secret. */
export interface TwoFactorSetupPayload {
  otpauthUrl: string;
  qrDataUrl: string;
  secret: string;
}

/** What POST /auth/2fa/activate returns — recovery codes are shown exactly once. */
export interface TwoFactorActivatePayload {
  user: User;
  recoveryCodes: string[];
}

export interface Passkey {
  /** base64url credential ID. */
  id: string;
  name: string | null;
  transports: string[];
  deviceType: string | null;
  backedUp: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}
