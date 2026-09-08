import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Authenticated user rotating their own password (current password required). */
export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPass123' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ minLength: 8, example: 'newStrongPass123' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
