import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@nuxion/shared-types';
import { BaseQueryDto } from '@common/dto/base-query.dto';

/** SPEC DRY #2 — extend BaseQueryDto, add only user-specific filters. */
export class QueryUserDto extends BaseQueryDto {
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
