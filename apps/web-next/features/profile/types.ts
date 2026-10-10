import type { User } from '@nuxion/shared-types';

/** Inputs for the self-service profile feature (mirrors BE DTOs). */
export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** The stored-file shape returned by `POST /files` (mirrors BE StoredFile). */
export interface UploadedFile {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}

export type { User };
