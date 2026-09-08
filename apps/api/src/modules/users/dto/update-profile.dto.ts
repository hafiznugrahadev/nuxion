import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Self-service profile update for the *authenticated* user. Deliberately narrow:
 * the display name and avatar are editable here — email is immutable and roles
 * can never be changed by the user themselves (that stays a SUPER_ADMIN action).
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'http://localhost:4400/uploads/avatars/abc.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;
}
