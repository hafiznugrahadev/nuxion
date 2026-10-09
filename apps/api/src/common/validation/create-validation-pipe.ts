import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export function flattenFieldErrors(errors: ValidationError[]): Record<string, string[]> {
  const fields: Record<string, string[]> = Object.create(null);
  function visit(error: ValidationError, parent = '') {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const messages = Object.values(error.constraints ?? {});
    if (messages.length) fields[path] = [...(fields[path] ?? []), ...messages];
    for (const child of error.children ?? []) visit(child, path);
  }
  for (const error of errors) visit(error);
  return fields;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    validationError: { target: false, value: false },
    exceptionFactory: (errors: ValidationError[]) => {
      const fieldErrors = flattenFieldErrors(errors);
      return new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: Object.values(fieldErrors).flat(),
        fieldErrors,
      });
    },
  });
}
