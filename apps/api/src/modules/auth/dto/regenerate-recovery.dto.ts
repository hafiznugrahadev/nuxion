import { IsString, MinLength } from 'class-validator';

export class RegenerateRecoveryDto {
  /** Current password — re-verified so a hijacked session can't rotate codes. */
  @IsString()
  @MinLength(6)
  password!: string;
}
