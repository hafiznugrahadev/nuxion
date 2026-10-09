import { ApiProperty } from '@nestjs/swagger';

/**
 * Response shape for a role. Roles are data (not an enum), so the well-known
 * SUPER_ADMIN/ADMIN/USER rows live alongside custom ones.
 */
export class RoleEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'CONTENT_EDITOR' })
  name!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ example: 3, description: 'How many users currently hold this role' })
  userCount!: number;
}
