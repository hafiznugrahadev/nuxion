import {
  Injectable,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, throwError } from 'rxjs';
import { withFieldErrors } from '../validation/field-exception';

@Injectable()
export class FileUploadErrorsInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next
      .handle()
      .pipe(
        catchError((error: unknown) =>
          throwError(() =>
            error instanceof PayloadTooLargeException ? withFieldErrors(error, ['file']) : error,
          ),
        ),
      );
  }
}
