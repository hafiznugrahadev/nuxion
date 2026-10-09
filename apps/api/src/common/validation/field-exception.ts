import type { HttpException } from '@nestjs/common';

/** Keep the exception's status/type/message while attaching known DTO fields. */
export function withFieldErrors<T extends HttpException>(exception: T, fields: string[]): T {
  const response = exception.getResponse();
  const body = typeof response === 'string' ? { message: response } : response;
  const Exception = exception.constructor as new (response: object) => T;
  return new Exception({
    ...body,
    fieldErrors: Object.fromEntries(fields.map((field) => [field, [exception.message]])),
  });
}
