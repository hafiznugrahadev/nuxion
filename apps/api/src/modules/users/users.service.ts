import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BaseCrudService } from '@common/services/base-crud.service';
import { PaginatedResult } from '@common/interfaces/paginated-result.interface';
import { hashPassword, verifyPassword } from '@common/utils/password';
import { RedisService } from '@infrastructure/redis/redis.service';
import { UserEntity } from './entities/user.entity';
import { UsersRepository, type UserWithRoles } from './users.repository';
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

/**
 * User management (super-admin CRUD). The password hash never leaves the
 * repository (`omit`), roles are assigned via the M2M relation, and the cached
 * list is invalidated by bumping a generation counter on every write.
 */
@Injectable()
export class UsersService extends BaseCrudService<
  UserEntity,
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto
> {
  protected readonly entityName = 'User';

  private readonly logger = new Logger(UsersService.name);
  private readonly cacheTtlSeconds = 30;
  private readonly genKey = 'users:gen';

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly redis: RedisService,
  ) {
    super(usersRepository);
  }

  override async findAll(query: QueryUserDto): Promise<PaginatedResult<UserEntity>> {
    const cacheKey = await this.listCacheKey(query);

    const cached = await this.safe(() => this.redis.get<PaginatedResult<UserEntity>>(cacheKey));
    if (cached) return cached;

    const where: Record<string, unknown> = {};
    if (query.roles?.length) where.roles = { some: { name: { in: query.roles } } };
    const page = await this.usersRepository.paginate(query, {
      where,
      include: { roles: true },
      omit: { password: true },
    });

    const result: PaginatedResult<UserEntity> = {
      ...page,
      data: page.data.map((u) => this.toEntity(u as unknown as UserWithRoles)),
    };

    await this.safe(() => this.redis.set(cacheKey, result, this.cacheTtlSeconds));
    return result;
  }

  override async findOne(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findWithRoles(id);
    if (!user) throw new NotFoundException(`${this.entityName} with id "${id}" not found`);
    return this.toEntity(user);
  }

  override async create(dto: CreateUserDto): Promise<UserEntity> {
    const { roles, password, ...rest } = dto;
    const created = await this.usersRepository.createWithRoles(
      { ...rest, password: await hashPassword(password) },
      roles,
    );
    await this.invalidateList();
    return this.toEntity(created);
  }

  override async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    await this.findOne(id); // 404 if missing
    const { roles, password, ...rest } = dto;
    const data = password ? { ...rest, password: await hashPassword(password) } : rest;
    const updated = await this.usersRepository.updateWithRoles(id, data, roles);
    await this.invalidateList();
    return this.toEntity(updated);
  }

  override async remove(id: string): Promise<UserEntity> {
    const existing = await this.findOne(id); // 404 if missing
    await this.usersRepository.delete(id);
    await this.invalidateList();
    return existing;
  }

  /**
   * Self-service profile update for the authenticated user. Name only — roles and
   * email are intentionally not touchable here (no privilege escalation).
   */
  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserEntity> {
    await this.findOne(id); // 404 if missing
    // Prisma ignores `undefined`, so only the provided fields are written.
    const updated = await this.usersRepository.updateWithRoles(id, {
      name: dto.name,
      avatarUrl: dto.avatarUrl,
    });
    await this.invalidateList();
    return this.toEntity(updated);
  }

  /**
   * Rotate the authenticated user's own password after verifying the current one.
   * Throws 401 if the current password is wrong so the message can't be used to
   * probe other accounts.
   */
  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersRepository.findWithPassword(id);
    if (!user) throw new NotFoundException(`${this.entityName} with id "${id}" not found`);

    const matches = await verifyPassword(dto.currentPassword, user.password);
    if (!matches) throw new UnauthorizedException('Current password is incorrect');

    await this.usersRepository.updateWithRoles(id, {
      password: await hashPassword(dto.newPassword),
    });
  }

  /** Flatten a user's Role[] into a string[] of role names for the response. */
  private toEntity(u: UserWithRoles): UserEntity {
    return { ...u, roles: u.roles.map((r) => r.name) };
  }

  private async listCacheKey(query: QueryUserDto): Promise<string> {
    const gen = (await this.safe(() => this.redis.get<number>(this.genKey))) ?? 0;
    return `users:list:${gen}:${JSON.stringify(query)}`;
  }

  /** Bump the cache generation so the next list read misses the stale cache.
   *  Public so other modules (e.g. auth registration) can keep the list fresh. */
  async invalidateList(): Promise<void> {
    await this.safe(() => this.redis.raw.incr(this.genKey));
  }

  /** Run a cache operation, swallowing errors so Redis is never a hard dependency. */
  private async safe<R>(fn: () => Promise<R>): Promise<R | null> {
    try {
      return await fn();
    } catch (err) {
      this.logger.warn(`Redis cache unavailable: ${(err as Error).message}`);
      return null;
    }
  }
}
