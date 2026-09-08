import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEmail, IsString, MinLength } from 'class-validator';
import { IsUnique } from '@common/validators/is-unique.validator';

export class CreateUserDto {
  @ApiProperty({ example: 'jane@nuxion.test' })
  @IsEmail()
  @IsUnique({ model: 'user', column: 'email' })
  email!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ minLength: 8, example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ type: [String], example: ['USER'], description: 'Role names to assign' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles!: string[];
}
