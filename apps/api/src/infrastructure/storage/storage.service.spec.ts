import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { RedisService } from '../redis/redis.service';
import { StorageService } from './storage.service';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==',
  'base64',
);

function setup(allowedMimeTypes = ['image/png']) {
  const driver = {
    upload: vi.fn().mockResolvedValue({ key: 'fixture.png' }),
    delete: vi.fn(),
    url: vi.fn(),
  };
  const service = new StorageService(
    driver,
    {} as RedisService,
    new ConfigService({ storage: { allowedMimeTypes, maxFileSizeBytes: 1024 } }),
  );
  return { service, driver };
}

describe('upload content validation', () => {
  it.each(['1.7', '2.0'])('accepts a PDF %s with canonical storage metadata', async (version) => {
    const { service, driver } = setup(['application/pdf']);
    let document = `%PDF-${version}\n`;
    const offsets = [0];
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 10 10] /Resources << >> >>',
    ];
    for (const [index, object] of objects.entries()) {
      offsets.push(Buffer.byteLength(document));
      document += `${index + 1} 0 obj\n${object}\nendobj\n`;
    }
    const xrefOffset = Buffer.byteLength(document);
    document += 'xref\n0 4\n0000000000 65535 f \n';
    for (const offset of offsets.slice(1)) {
      document += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }
    document += `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    const buffer = Buffer.from(document);
    await service.upload({
      buffer,
      originalname: 'fixture.pdf',
      mimetype: 'application/pdf',
      size: buffer.length,
    });
    expect(driver.upload).toHaveBeenCalledWith(
      expect.objectContaining({ originalName: 'file.pdf', mimeType: 'application/pdf' }),
    );
  });

  it('accepts an actual PNG and supplies canonical storage metadata', async () => {
    const { service, driver } = setup();
    await service.upload(
      { buffer: png, originalname: '../../UNTRUSTED.PNG', mimetype: 'image/png', size: png.length },
      'avatars',
    );
    expect(driver.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        originalName: 'file.png',
        mimeType: 'image/png',
        size: png.length,
        folder: 'avatars',
      }),
    );
  });

  it.each(['payload.html', 'payload.js', 'payload.svg', 'payload.png'])(
    'rejects HTML masquerading as image/png (%s)',
    async (originalname) => {
      const { service, driver } = setup();
      const buffer = Buffer.from('<html><script src="fixture.js"></script></html>');
      await expect(
        service.upload({ buffer, originalname, mimetype: 'image/png', size: buffer.length }),
      ).rejects.toThrow('invalid file content');
      expect(driver.upload).not.toHaveBeenCalled();
    },
  );

  it('rejects extension mismatch, truncated content, and unsupported configured MIME', async () => {
    for (const file of [
      { buffer: png, originalname: 'fixture.html', mimetype: 'image/png', size: png.length },
      { buffer: png.subarray(0, 24), originalname: 'fixture.png', mimetype: 'image/png', size: 24 },
    ]) {
      const { service, driver } = setup();
      await expect(service.upload(file)).rejects.toThrow();
      expect(driver.upload).not.toHaveBeenCalled();
    }
    const { service, driver } = setup(['text/html']);
    const buffer = Buffer.from('<h1>Fixture</h1>');
    await expect(
      service.upload({
        buffer,
        originalname: 'fixture.html',
        mimetype: 'text/html',
        size: buffer.length,
      }),
    ).rejects.toThrow();
    expect(driver.upload).not.toHaveBeenCalled();
  });

  it('enforces the actual buffer size rather than the submitted size', async () => {
    const { service, driver } = setup();
    await expect(
      service.upload({
        buffer: Buffer.alloc(2048),
        originalname: 'fixture.png',
        mimetype: 'image/png',
        size: 1,
      }),
    ).rejects.toThrow('File exceeds');
    expect(driver.upload).not.toHaveBeenCalled();
  });
});
