import { BaseQueryDto } from '../dto/base-query.dto';
import { buildPaginationMeta, PaginatedResult } from '../interfaces/paginated-result.interface';

/**
 * Minimal structural type of a Prisma model delegate (e.g. `prisma.field`).
 * Avoids coupling the base class to a concrete model while staying type-checked.
 */
export interface PrismaDelegate {
  findMany(args?: any): Promise<any[]>;
  findUnique(args: any): Promise<any | null>;
  findFirst(args: any): Promise<any | null>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  delete(args: any): Promise<any>;
  count(args?: any): Promise<number>;
}

/**
 * SPEC ⭐ `BaseRepository<T>` — the only place that talks to Prisma directly.
 * Subclasses expose the concrete delegate + searchable fields; everything else
 * (pagination, search OR-clause, sorting) is inherited.
 */
export abstract class BaseRepository<T> {
  /** Concrete Prisma delegate, e.g. `this.prisma.field`. */
  protected abstract get delegate(): PrismaDelegate;

  /** Columns included in `?search=` (case-insensitive contains). */
  protected readonly searchableFields: string[] = [];

  async paginate(
    query: BaseQueryDto,
    options: {
      where?: Record<string, unknown>;
      include?: Record<string, unknown>;
      /** Columns to exclude from each row (e.g. `{ password: true }`). */
      omit?: Record<string, boolean>;
    } = {},
  ): Promise<PaginatedResult<T>> {
    const { page, limit, search, order, sortBy } = query;

    const where: Record<string, unknown> = { ...(options.where ?? {}) };
    if (search && this.searchableFields.length > 0) {
      where.OR = this.searchableFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
    }

    const [data, total] = await Promise.all([
      this.delegate.findMany({
        where,
        include: options.include,
        omit: options.omit,
        orderBy: { [sortBy]: order },
        skip: query.skip,
        take: limit,
      }),
      this.delegate.count({ where }),
    ]);

    return { data: data as T[], meta: buildPaginationMeta(total, page, limit) };
  }

  findById(id: string, include?: Record<string, unknown>): Promise<T | null> {
    return this.delegate.findUnique({ where: { id }, include }) as Promise<T | null>;
  }

  findOne(where: Record<string, unknown>, include?: Record<string, unknown>): Promise<T | null> {
    return this.delegate.findFirst({ where, include }) as Promise<T | null>;
  }

  create(data: Record<string, unknown>, include?: Record<string, unknown>): Promise<T> {
    return this.delegate.create({ data, include }) as Promise<T>;
  }

  update(id: string, data: Record<string, unknown>, include?: Record<string, unknown>): Promise<T> {
    return this.delegate.update({ where: { id }, data, include }) as Promise<T>;
  }

  delete(id: string): Promise<T> {
    return this.delegate.delete({ where: { id } }) as Promise<T>;
  }

  count(where: Record<string, unknown> = {}): Promise<number> {
    return this.delegate.count({ where });
  }

  exists(where: Record<string, unknown>): Promise<boolean> {
    return this.delegate.count({ where }).then((n) => n > 0);
  }
}
