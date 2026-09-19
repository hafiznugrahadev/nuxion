import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * WebAuthn responses are opaque authenticator payloads (typed by
 * @simplewebauthn) — they are passed through to the verifier untouched, so a
 * deep DTO would only fight the browser library's shape.
 */
export class VerifyPasskeyRegistrationDto {
  /** Optional user label, e.g. "MacBook Touch ID". */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name?: string;

  @IsObject()
  response!: RegistrationResponseJSON;
}

export class VerifyPasskeyLoginDto {
  @IsString()
  @IsNotEmpty()
  challengeId!: string;

  @IsObject()
  response!: AuthenticationResponseJSON;
}
