import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RolesService } from '../roles.service';
import type { RolesRepository, RoleWithCount } from '../roles.repository';
import type { UsersService } from '@modules/users/users.service';

const customRole: RoleWithCount = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'CONTENT_EDITOR',
  createdAt: new Date('2026-10-07T00:00:00.000Z'),
  userCount: 2,
};

const wellKnownRole: RoleWithCount = { ...customRole, name: 'SUPER_ADMIN', userCount: 1 };

function makeService(findByIdResult: RoleWithCount | null = customRole) {
  const repository = {
    listWithCounts: vi.fn().mockResolvedValue([wellKnownRole, customRole]),
    findById: vi.fn().mockResolvedValue(findByIdResult),
    findByName: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'NEW_ROLE',
      createdAt: new Date('2026-10-07T00:00:00.000Z'),
    }),
    rename: vi.fn().mockResolvedValue({ ...customRole, name: 'RENAMED_ROLE' }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const usersService = { invalidateList: vi.fn().mockResolvedValue(undefined) };
  const service = new RolesService(
    repository as unknown as RolesRepository,
    usersService as unknown as UsersService,
  );
  return { service, repository, usersService };
}

describe('RolesService', () => {
  it('findAll maps catalog rows to entities', async () => {
    const { service, repository } = makeService();
    const result = await service.findAll();
    expect(repository.listWithCounts).toHaveBeenCalledOnce();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: 'SUPER_ADMIN', userCount: 1 });
  });

  it('create delegates to the repository and reports zero holders', async () => {
    const { service, repository, usersService } = makeService();
    const result = await service.create({ name: 'NEW_ROLE' });
    expect(repository.create).toHaveBeenCalledWith({ name: 'NEW_ROLE' });
    expect(result.userCount).toBe(0);
    // A brand-new role is held by nobody — the user list cache stays valid.
    expect(usersService.invalidateList).not.toHaveBeenCalled();
  });

  it('update renames a custom role and invalidates the user list cache', async () => {
    const { service, repository, usersService } = makeService();
    const result = await service.update(customRole.id, { name: 'RENAMED_ROLE' });
    expect(repository.rename).toHaveBeenCalledWith(customRole.id, 'RENAMED_ROLE');
    expect(result.name).toBe('RENAMED_ROLE');
    expect(usersService.invalidateList).toHaveBeenCalledOnce();
  });

  it('update is a no-op when the name is unchanged', async () => {
    const { service, repository, usersService } = makeService();
    const result = await service.update(customRole.id, { name: 'CONTENT_EDITOR' });
    expect(repository.rename).not.toHaveBeenCalled();
    expect(usersService.invalidateList).not.toHaveBeenCalled();
    expect(result.name).toBe('CONTENT_EDITOR');
  });

  it('update rejects a name another role already holds', async () => {
    const { service, repository } = makeService();
    repository.findByName.mockResolvedValue({ id: 'other-id', name: 'TAKEN' });
    await expect(service.update(customRole.id, { name: 'TAKEN' })).rejects.toThrow(
      ConflictException,
    );
    await expect(service.update(customRole.id, { name: 'TAKEN' })).rejects.toMatchObject({
      response: { fieldErrors: { name: ['name already exists'] } },
    });
    expect(repository.rename).not.toHaveBeenCalled();
  });

  it('update refuses to rename a built-in role', async () => {
    const { service, repository } = makeService(wellKnownRole);
    await expect(service.update(wellKnownRole.id, { name: 'GOD_MODE' })).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.rename).not.toHaveBeenCalled();
  });

  it('remove deletes a custom role and invalidates the user list cache', async () => {
    const { service, repository, usersService } = makeService();
    const result = await service.remove(customRole.id);
    expect(repository.delete).toHaveBeenCalledWith(customRole.id);
    expect(usersService.invalidateList).toHaveBeenCalledOnce();
    expect(result.id).toBe(customRole.id);
  });

  it('remove refuses to delete a built-in role', async () => {
    const { service, repository } = makeService(wellKnownRole);
    await expect(service.remove(wellKnownRole.id)).rejects.toThrow(BadRequestException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('throws 404 for an unknown id', async () => {
    const { service } = makeService(null);
    await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
  });
});
