import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { del, issueSignedToken, presignUrl, put } from '@vercel/blob';
import { VercelBlobStorageDriver } from './vercel-blob.driver';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
  issueSignedToken: vi.fn(),
  presignUrl: vi.fn(),
}));

const token = 'server-only-read-write-token';
const driver = new VercelBlobStorageDriver({
  token,
  viewBaseUrl: 'https://api.example.test/api/files/view',
});
const upload = {
  buffer: Buffer.from('image'),
  originalName: 'portrait.PNG',
  mimeType: 'image/png',
  size: 5,
  folder: 'avatars',
};

describe('VercelBlobStorageDriver', () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uploads unique objects privately and returns a stable application URL without credentials', async () => {
    const stored = await driver.upload(upload);

    expect(stored.key).toMatch(/^avatars\/[0-9a-f-]+\.png$/);
    expect(put).toHaveBeenCalledWith(stored.key, upload.buffer, {
      token,
      access: 'private',
      contentType: 'image/png',
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    expect(new URL(stored.url).searchParams.get('key')).toBe(stored.key);
    expect(stored).toMatchObject({ mimeType: 'image/png', size: 5 });
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it('scopes signed downloads to one pathname, GET only and the configured lifetime', async () => {
    const now = Date.now();
    const key = 'avatars/private.png';
    const signing = {
      delegationToken: 'delegation',
      clientSigningToken: 'private-signing-key',
      validUntil: now + 60_000,
    };
    vi.spyOn(Date, 'now').mockReturnValue(now);
    vi.mocked(issueSignedToken).mockResolvedValue(signing);
    vi.mocked(presignUrl).mockResolvedValue({
      presignedUrl:
        'https://store.private.blob.vercel-storage.com/avatars/private.png?signed=value',
    });

    const result = await driver.signedUrl(key, 60);

    expect(issueSignedToken).toHaveBeenCalledWith({
      token,
      pathname: key,
      operations: ['get'],
      validUntil: now + 60_000,
    });
    expect(presignUrl).toHaveBeenCalledWith(signing, {
      access: 'private',
      pathname: key,
      operation: 'get',
      validUntil: now + 60_000,
    });
    expect(result).not.toContain(token);
    expect(result).not.toContain(signing.clientSigningToken);
  });

  it('deletes the selected object using server-side credentials', async () => {
    await driver.delete('avatars/obsolete.png');

    expect(del).toHaveBeenCalledWith('avatars/obsolete.png', { token });
  });

  it('propagates failed uploads instead of returning a successful file result', async () => {
    const failure = new Error('Blob upload failed');
    vi.mocked(put).mockRejectedValue(failure);

    await expect(driver.upload(upload)).rejects.toBe(failure);
  });
});
