import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { createValidationPipe } from '@common/validation/create-validation-pipe';
import type { StorageService } from '@infrastructure/storage/storage.service';
import { ViewFileDto } from './dto/view-file.dto';
import { FilesController } from './files.controller';

describe('file URL handling', () => {
  it.each([
    '../private.sql',
    '/private.sql',
    'other-object.sql',
    ['uploads/test.png'],
    { key: 'fixture' },
  ])('rejects unsupported or malformed object keys', async (key) => {
    await expect(
      createValidationPipe().transform({ key }, { type: 'query', metatype: ViewFileDto }),
    ).rejects.toThrow();
  });

  it('accepts generated upload keys', async () => {
    const key = 'avatars/2f1f7a44-8574-43a8-892d-38090a7f30ec.png';
    await expect(
      createValidationPipe().transform({ key }, { type: 'query', metatype: ViewFileDto }),
    ).resolves.toMatchObject({ key });
  });

  it('uses canonical configuration for signed upload URLs', async () => {
    const key = 'avatars/2f1f7a44-8574-43a8-892d-38090a7f30ec.png';
    const storage = {
      signed: true,
      upload: vi.fn().mockResolvedValue({
        key,
        url: 'https://bucket.invalid/object',
        mimeType: 'image/png',
        size: 1,
      }),
    } as unknown as StorageService;
    const controller = new FilesController(
      storage,
      new ConfigService({ app: { appUrl: 'https://app.fixture.invalid', apiPrefix: 'api' } }),
    );
    await expect(
      controller.upload({
        buffer: Buffer.from('fixture'),
        mimetype: 'image/png',
        size: 7,
        originalname: 'fixture.png',
      }),
    ).resolves.toMatchObject({
      url: `https://app.fixture.invalid/api/files/view?key=${encodeURIComponent(key)}`,
    });
  });
});
