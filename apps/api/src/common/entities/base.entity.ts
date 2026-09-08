import { ApiProperty } from '@nestjs/swagger';

/**
 * SPEC DRY #1 — every entity extends this instead of re-declaring id/timestamps.
 * Entities are the *response shape* (never expose Prisma models directly).
 */
export abstract class BaseEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
