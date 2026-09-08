import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccessResponse, PaginationMeta } from '@nuxion/shared-types';

interface MaybePaginated {
  data: unknown;
  meta: PaginationMeta;
}

function isPaginated(value: unknown): value is MaybePaginated {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value &&
    typeof (value as MaybePaginated).meta === 'object'
  );
}

/**
 * SPEC DRY #6 — wrap every successful response in `{ success, data, meta? }`.
 * Registered once globally in `main.ts`. Recognises `PaginatedResult` and lifts
 * its `meta` to the envelope level so list endpoints stay uniform.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<unknown>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<unknown>> {
    return next.handle().pipe(
      map((payload) => {
        if (isPaginated(payload)) {
          return { success: true, data: payload.data, meta: payload.meta };
        }
        return { success: true, data: payload ?? null };
      }),
    );
  }
}
