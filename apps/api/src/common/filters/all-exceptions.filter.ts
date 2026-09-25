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

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as { message?: string | string[]; error?: string };
        message = body.message ?? exception.message;
        error = body.error ?? exception.name;
      }
    } else {
      // Drizzle wraps driver errors in DrizzleQueryError — walk the cause chain
      // to the underlying pg DatabaseError carrying the PostgreSQL SQLSTATE.
      const pgError = extractPgError(exception);
      if (pgError) {
        ({ status, message, error } = this.mapDatabaseError(pgError));
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
    };

    response.status(status).json(body);
  }

  private mapDatabaseError(e: DatabaseError): {
    status: number;
    message: string;
    error: string;
  } {
    switch (e.code) {
      case '23505': {
        // Unique violation — the constraint name encodes table + column
        // (e.g. `users_email_key` → email, `refresh_tokens_tokenHash_key` → tokenHash).
        return {
          status: HttpStatus.CONFLICT,
          message: `Unique constraint failed on: ${columnFromConstraint(e.constraint)}`,
          error: 'Conflict',
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

/** Table-name prefixes found in this schema's constraint names (longest first). */
const CONSTRAINT_TABLES = [
  'password_reset_tokens',
  'refresh_tokens',
  'notifications',
  'user_roles',
  'passkeys',
  'settings',
  'users',
  'roles',
].sort((a, b) => b.length - a.length);

/** `users_email_key` → `email`; falls back to a generic label. */
function columnFromConstraint(constraint: string | undefined): string {
  if (!constraint?.endsWith('_key')) return 'field';
  const base = constraint.slice(0, -'_key'.length);
  const table = CONSTRAINT_TABLES.find((t) => base.startsWith(`${t}_`));
  return table ? base.slice(table.length + 1) : base;
}
