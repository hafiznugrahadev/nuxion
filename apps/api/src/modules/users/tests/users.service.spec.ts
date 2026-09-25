import { describe, expect, it, vi } from 'vitest';
import { UsersService } from '../users.service';
import type { UsersRepository } from '../users.repository';
import type { RedisService } from '@infrastructure/redis/redis.service';
import type { QueryUserDto } from '../dto/query-user.dto';

const emptyPage = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };

function makeService(redisGet: unknown = null) {
  const repository = { paginate: vi.fn().mockResolvedValue(emptyPage) };
  const redis = {
    get: vi.fn().mockResolvedValue(redisGet),
    set: vi.fn().mockResolvedValue(undefined),
  };
  const service = new UsersService(
    repository as unknown as UsersRepository,
    redis as unknown as RedisService,
  );
  return { service, repository, redis };
}

const query = { page: 1, limit: 10, order: 'desc', sortBy: 'createdAt' } as QueryUserDto;

describe('UsersService.findAll', () => {
  it('delegates to the repository with the role filter (secrets are omitted inside it)', async () => {
    const { service, repository } = makeService();
    const rolesQuery = { ...query, roles: ['ADMIN'] } as QueryUserDto;
    await service.findAll(rolesQuery);
    expect(repository.paginate).toHaveBeenCalledWith(rolesQuery, { roles: ['ADMIN'] });
  });

  it('serves from cache without hitting the repository', async () => {
    const { service, repository } = makeService(emptyPage);
    const result = await service.findAll(query);
    expect(result).toEqual(emptyPage);
    expect(repository.paginate).not.toHaveBeenCalled();
  });
});
