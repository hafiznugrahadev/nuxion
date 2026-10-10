export interface TwoFactorSetupPayload {
  qrDataUrl: string;
  secret: string;
}

export interface TwoFactorActivatePayload {
  recoveryCodes: string[];
}

export interface Passkey {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}
