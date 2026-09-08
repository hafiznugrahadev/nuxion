import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface IsUniqueArgs {
  /** Prisma model name, e.g. 'user' (matches `prisma.user`). */
  model: string;
  /** Column to check, defaults to the decorated property name. */
  column?: string;
}

/**
 * SPEC DRY #8 — async DB-backed uniqueness validator. Registered as a provider so
 * class-validator (via `useContainer`) can inject PrismaService.
 *   `@IsUnique({ model: 'user', column: 'email' }) email: string;`
 */
@ValidatorConstraint({ name: 'IsUnique', async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    if (value === undefined || value === null) return true;
    const { model, column } = args.constraints[0] as IsUniqueArgs;
    const field = column ?? args.property;

    const delegate = (
      this.prisma as unknown as Record<string, { count: (a: unknown) => Promise<number> }>
    )[model];
    if (!delegate) return true;

    const count = await delegate.count({ where: { [field]: value } });
    return count === 0;
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
