import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  /** Either a 6-digit TOTP code or a XXXXX-XXXXX recovery code. */
  @IsString()
  @MinLength(6)
  @MaxLength(11)
  code!: string;
}
