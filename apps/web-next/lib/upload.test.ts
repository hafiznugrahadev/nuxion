import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadFile } from './upload';
import { jsonRes } from './test-render';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => fetchMock.mockReset());

describe('uploadFile', () => {
  it('posts multipart FormData with the folder query and unwraps the payload', async () => {
    fetchMock.mockResolvedValue(
      jsonRes(201, {
        success: true,
        data: { key: 'avatars/x', url: 'http://u/avatars/x', mimeType: 'image/png', size: 1 },
      }),
    );
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const out = await uploadFile(file, 'avatars');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/files?folder=avatars');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBe(file);
    expect(out.url).toBe('http://u/avatars/x');
  });

  it('omits the query without a folder', async () => {
    fetchMock.mockResolvedValue(
      jsonRes(201, { success: true, data: { key: 'k', url: 'u', mimeType: '', size: 0 } }),
    );
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await uploadFile(file);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/files');
  });
});
