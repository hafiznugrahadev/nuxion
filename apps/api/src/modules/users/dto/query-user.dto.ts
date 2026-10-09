import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from '@common/dto/base-query.dto';

/** Columns the user list can be sorted by (repository order-by keys). */
const SORTABLE_USER_FIELDS = ['name', 'email', 'createdAt'] as const;

/** SPEC DRY #2 — extend BaseQueryDto, add only user-specific filters. */
export class QueryUserDto extends BaseQueryDto {
  /**
   * Overridden from the base's free-form string so an unknown column (e.g.
   * `?sortBy=roles`, a relation) is a 400, not a database error from orderBy.
   */
  @ApiPropertyOptional({ enum: SORTABLE_USER_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(SORTABLE_USER_FIELDS)
  override sortBy: (typeof SORTABLE_USER_FIELDS)[number] = 'createdAt';

  /**
   * Filter by one or more roles — returns users holding ANY of them. Repeatable
   * query param: `?roles=ADMIN&roles=USER`. A single value is coerced to an
   * array. Plain strings, not an enum: custom catalog roles filter too.
   */
  @ApiPropertyOptional({ type: [String], example: ['ADMIN', 'CONTENT_EDITOR'] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}
