import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Rename only. Uniqueness is checked by the service (not `@IsUnique`) so
 * PATCHing a role with its own current name is not a false collision.
 */
export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'CONTENT_EDITOR', minLength: 2, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'name must be UPPER_SNAKE_CASE (letters A-Z, digits, underscore)',
  })
  name?: string;
}
