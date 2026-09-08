import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsOptional } from 'class-validator';
import { UserRole } from '@nuxion/shared-types';
import { BaseQueryDto } from '@common/dto/base-query.dto';

/** Columns the user list can be sorted by (Prisma orderBy keys). */
const SORTABLE_USER_FIELDS = ['name', 'email', 'createdAt'] as const;

/** SPEC DRY #2 — extend BaseQueryDto, add only user-specific filters. */
export class QueryUserDto extends BaseQueryDto {
  /**
   * Overridden from the base's free-form string so an unknown column (e.g.
   * `?sortBy=roles`, a relation) is a 400, not a Prisma 500 from orderBy.
   */
  @ApiPropertyOptional({ enum: SORTABLE_USER_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(SORTABLE_USER_FIELDS)
  override sortBy: (typeof SORTABLE_USER_FIELDS)[number] = 'createdAt';

  /**
   * Filter by one or more roles — returns users holding ANY of them. Repeatable
   * query param: `?roles=ADMIN&roles=USER`. A single value is coerced to an array.
   */
  @ApiPropertyOptional({ enum: UserRole, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}
