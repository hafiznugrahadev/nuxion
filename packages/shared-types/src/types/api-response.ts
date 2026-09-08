/**
 * Canonical API envelope produced by the BE `ResponseInterceptor` (SPEC DRY #6).
 * FE `apiClient` unwraps `data` based on these shapes — keep in lockstep with
 * `apps/api/src/common/interceptors/response.interceptor.ts`.
 */

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** A page of `T` as returned by list endpoints. */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}
