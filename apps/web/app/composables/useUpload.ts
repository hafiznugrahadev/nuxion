import type { ApiResponse } from '@nuxion/shared-types';
import { unwrap } from '~/lib/api-client';
import { useApi } from '~/composables/useApi';

/** The stored-file shape returned by `POST /files` (mirrors BE StoredFile). */
export interface UploadedFile {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}

/**
 * Reusable file uploader → `POST /files` (multipart). Returns the stored file's
 * public URL for the caller to persist. Goes through the shared `useApi` client,
 * so the auth header + transparent 401→refresh→retry apply. Compose with a form
 * (e.g. FileField) or a direct file picker.
 */
export function useUpload() {
  const api = useApi();

  return {
    uploadFile(file: File, folder?: string): Promise<UploadedFile> {
      const form = new FormData();
      form.append('file', file);
      return api<ApiResponse<UploadedFile>>('/files', {
        method: 'POST',
        body: form,
        query: folder ? { folder } : undefined,
      }).then(unwrap);
    },
  };
}
