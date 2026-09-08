import { NotFoundException } from '@nestjs/common';
import { BaseQueryDto } from '../dto/base-query.dto';
import { PaginatedResult } from '../interfaces/paginated-result.interface';
import { BaseRepository } from '../repositories/base.repository';

/**
 * SPEC DRY #5 — generic CRUD service. Feature services extend this and override
 * only the methods that need custom business logic (e.g. price calculation,
 * conflict checks). `entityName` powers human-readable 404 messages.
 */
export abstract class BaseCrudService<
  T,
  CreateDto,
  UpdateDto,
  QueryDto extends BaseQueryDto = BaseQueryDto,
> {
  protected abstract readonly entityName: string;

  constructor(protected readonly repository: BaseRepository<T>) {}

  /** Override to attach default relations to list/detail reads. */
  protected get defaultInclude(): Record<string, unknown> | undefined {
    return undefined;
  }

  findAll(query: QueryDto): Promise<PaginatedResult<T>> {
    return this.repository.paginate(query, { include: this.defaultInclude });
  }

  async findOne(id: string): Promise<T> {
    const entity = await this.repository.findById(id, this.defaultInclude);
    if (!entity) {
      throw new NotFoundException(`${this.entityName} with id "${id}" not found`);
    }
    return entity;
  }

  create(dto: CreateDto): Promise<T> {
    return this.repository.create(dto as Record<string, unknown>, this.defaultInclude);
  }

  async update(id: string, dto: UpdateDto): Promise<T> {
    await this.findOne(id); // 404 if missing
    return this.repository.update(id, dto as Record<string, unknown>, this.defaultInclude);
  }

  async remove(id: string): Promise<T> {
    await this.findOne(id); // 404 if missing
    return this.repository.delete(id);
  }
}
