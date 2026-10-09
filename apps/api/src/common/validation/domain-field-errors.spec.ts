import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { mockDb } from '../../../test/helpers/mock-db';
import { AuthService } from '@modules/auth/auth.service';
import { UsersService } from '@modules/users/users.service';
import { StorageService } from '@infrastructure/storage/storage.service';
import { hashPassword } from '../utils/password';
import { syncUserRoles } from '@db/user-roles';

describe('domain form field errors', () => {
  it('preserves generic login failure and binds both credential controls', async () => {
    const { db } = mockDb();
    const service = new AuthService(
      db,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.login({ email: 'missing@example.test', password: 'bad-password' }),
    ).rejects.toMatchObject({
      status: 401,
      response: {
        message: 'Invalid credentials',
        error: 'Unauthorized',
        fieldErrors: { email: ['Invalid credentials'], password: ['Invalid credentials'] },
      },
    });
  });

  it('attributes duplicate registration email without changing conflict status', async () => {
    const { db } = mockDb({ select: [{ id: 'existing', email: 'taken@example.test' }] });
    const service = new AuthService(
      db,
      {} as never,
      { get: () => true } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.register({ email: 'taken@example.test', name: 'Name', password: 'password' }),
    ).rejects.toMatchObject({
      status: 409,
      response: { fieldErrors: { email: ['Email is already registered'] } },
    });
  });

  it('binds an incorrect current password and never writes the replacement', async () => {
    const repository = {
      findWithPassword: vi
        .fn()
        .mockResolvedValue({ password: await hashPassword('correct-password') }),
      updateWithRoles: vi.fn(),
    };
    const service = new UsersService(repository as never, {} as never);
    const promise = service.changePassword('user', {
      currentPassword: 'wrong-password',
      newPassword: 'new-password',
    });
    await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(promise).rejects.toMatchObject({
      response: {
        fieldErrors: { currentPassword: ['Current password is incorrect'] },
      },
    });
    expect(repository.updateWithRoles).not.toHaveBeenCalled();
  });

  it('attributes unknown assigned role names to the role selector', async () => {
    const { db } = mockDb();
    await expect(syncUserRoles(db, 'user', ['MISSING'])).rejects.toMatchObject({
      status: 404,
      response: { fieldErrors: { roles: ['Record not found'] } },
    });
  });

  it('binds missing, oversized, and unsupported uploads to the file control', async () => {
    const driver = { upload: vi.fn() };
    const config = {
      get: (key: string) =>
        ({
          'storage.maxFileSizeBytes': 1024 * 1024,
          'storage.allowedMimeTypes': ['image/png'],
        })[key],
    };
    const service = new StorageService(driver as never, {} as never, config as never);
    const file = {
      buffer: Buffer.from('file'),
      originalname: 'file.txt',
      mimetype: 'text/plain',
      size: 4,
    };
    for (const [input, status] of [
      [undefined, 400],
      [{ ...file, size: 2 * 1024 * 1024 }, 413],
      [file, 415],
    ] as const) {
      await expect(service.upload(input)).rejects.toMatchObject({
        status,
        response: {
          fieldErrors: { file: [expect.any(String)] },
        },
      });
    }
    expect(driver.upload).not.toHaveBeenCalled();
  });
});
