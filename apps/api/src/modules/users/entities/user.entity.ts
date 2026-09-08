import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '@common/entities/base.entity';

/** Response shape for a user — never includes the password hash (SPEC DRY #1). */
export class UserEntity extends BaseEntity {
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) avatarUrl?: string | null;
  @ApiProperty({ type: [String], example: ['ADMIN', 'USER'] }) roles!: string[];
}
