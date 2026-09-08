/** Shared shape for list query params — mirrors BE `BaseQueryDto` (SPEC DRY #2). */
export interface BaseQuery {
  page?: number;
  limit?: number;
  search?: string;
  order?: 'asc' | 'desc';
  sortBy?: string;
}
