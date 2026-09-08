import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from '@nuxion/shared-types';

/** SPEC DRY #4 — uniform pagination meta across every list endpoint. */
export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}

/**
 * Generic page envelope. `data` is typed per-feature via the
 * `ApiPaginatedResponse(Model)` decorator (SPEC DRY #9) since generics are
 * erased at runtime and invisible to Swagger.
 */
export class PaginatedDto<T> {
  @ApiProperty({ isArray: true })
  data!: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
