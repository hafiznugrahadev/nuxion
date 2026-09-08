/** Inputs for the self-service profile feature (mirrors BE DTOs). */
export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
