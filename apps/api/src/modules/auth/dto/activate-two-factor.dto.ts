import { IsString, Matches } from 'class-validator';

export class ActivateTwoFactorDto {
  /** The 6-digit code currently shown in the user's authenticator app. */
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit TOTP code' })
  code!: string;
}
