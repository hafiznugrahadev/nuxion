import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq, sql } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import type { Database } from '@db/relations';
import { roles, settings, users } from '@db/schema';

/**
 * Model-name → Drizzle table registry for the async uniqueness check. Register
 * new tables here as they gain `@IsUnique` columns.
 */
const UNIQUE_TABLES = {
  user: users,
  role: roles,
  setting: settings,
} as const;

export interface IsUniqueArgs {
  /** Registry model name, e.g. 'user' (matches UNIQUE_TABLES above). */
  model: keyof typeof UNIQUE_TABLES;
  /** Column to check, defaults to the decorated property name. */
  column?: string;
}

/**
 * SPEC DRY #8 — async DB-backed uniqueness validator. Registered as a provider
 * so class-validator (via `useContainer`) can inject the database.
 *   `@IsUnique({ model: 'user', column: 'email' }) email: string;`
 */
@ValidatorConstraint({ name: 'IsUnique', async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(
    @InjectDrizzle()
    private readonly db: Database,
  ) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    if (value === undefined || value === null) return true;
    const { model, column } = args.constraints[0] as IsUniqueArgs;
    const field = column ?? args.property;

    const table = UNIQUE_TABLES[model] as PgTable | undefined;
    if (!table) return true;
    const columnRef = (table as unknown as Record<string, PgColumn | undefined>)[field];
    if (!columnRef) return true;

    const rows = await this.db
      .select({ one: sql`1` })
      .from(table)
      .where(eq(columnRef, value as string))
      .limit(1);
    return rows.length === 0;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} already exists`;
  }
}

export function IsUnique(args: IsUniqueArgs, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'IsUnique',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [args],
      validator: IsUniqueConstraint,
    });
  };
}
