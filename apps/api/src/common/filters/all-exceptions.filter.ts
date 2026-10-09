import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DatabaseError } from 'pg';
import type { Request, Response } from 'express';
import type { ApiErrorResponse } from '@nuxion/shared-types';

/**
 * Global filter producing the `{ success:false, ... }` error envelope. Maps known
 * PostgreSQL errors (surfaced through Drizzle) to sensible HTTP codes so the FE
 * always sees a consistent shape.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';
    let fieldErrors: ApiErrorResponse['fieldErrors'];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as { message?: string | string[]; error?: string; fieldErrors?: unknown };
        message = body.message ?? exception.message;
        error = body.error ?? exception.name;
        fieldErrors = sanitizeFieldErrors(body.fieldErrors);
      }
    } else {
      // Drizzle wraps driver errors in DrizzleQueryError — walk the cause chain
      // to the underlying pg DatabaseError carrying the PostgreSQL SQLSTATE.
      const pgError = extractPgError(exception);
      if (pgError) {
        ({ status, message, error, fieldErrors } = this.mapDatabaseError(pgError));
      } else if (exception instanceof Error) {
        message = exception.message;
        error = exception.name;
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(fieldErrors && { fieldErrors }),
    };

    response.status(status).json(body);
  }

  private mapDatabaseError(e: DatabaseError): {
    status: number;
    message: string;
    error: string;
    fieldErrors?: Record<string, string[]>;
  } {
    switch (e.code) {
      case '23505': {
        const field = PUBLIC_UNIQUE_FIELDS[e.constraint ?? ''];
        const message = field
          ? `Unique constraint failed on: ${field}`
          : 'Unique constraint failed';
        return {
          status: HttpStatus.CONFLICT,
          message,
          error: 'Conflict',
          ...(field && { fieldErrors: { [field]: [message] } }),
        };
      }
      case '23503':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record constraint failed',
          error: 'BadRequest',
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Database error (${e.code})`,
          error: 'BadRequest',
        };
    }
  }
}

/** Unwrap a pg DatabaseError from a Drizzle error's cause chain, if any. */
function extractPgError(exception: unknown): DatabaseError | undefined {
  let current: unknown = exception;
  while (current instanceof Error) {
    if (current instanceof DatabaseError) return current;
    current = current.cause;
  }
  return undefined;
}

const PUBLIC_UNIQUE_FIELDS: Record<string, string> = Object.assign(Object.create(null), {
  users_email_key: 'email',
  roles_name_key: 'name',
});

function sanitizeFieldErrors(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value).filter(
    ([field, messages]) =>
      /^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/.test(field) &&
      !field.split('.').some((part) => ['__proto__', 'constructor', 'prototype'].includes(part)) &&
      Array.isArray(messages) &&
      messages.length > 0 &&
      messages.every((message) => typeof message === 'string'),
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}
