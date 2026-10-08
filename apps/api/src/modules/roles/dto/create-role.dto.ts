import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsUnique } from '@common/validators/is-unique.validator';

/** Role names are UPPER_SNAKE_CASE — matches the seeded SUPER_ADMIN/ADMIN/USER. */
const ROLE_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export class CreateRoleDto {
  @ApiProperty({ example: 'CONTENT_EDITOR', minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(ROLE_NAME_PATTERN, {
    message: 'name must be UPPER_SNAKE_CASE (letters A-Z, digits, underscore)',
  })
  @IsUnique({ model: 'role', column: 'name' })
  name!: string;
}
