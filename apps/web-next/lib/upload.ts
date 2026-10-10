import type { UploadedFile } from '@/features/profile/types';
import { apiFetch } from '@/lib/use-api';

/**
 * Reusable file uploader → `POST /files` (multipart). Returns the stored
 * file's public URL for the caller to persist. Port of the Nuxt variant's
 * useUpload: auth header + transparent 401→refresh→retry via the shared
 * apiFetch plumbing (the api client leaves FormData bodies to the browser's
 * multipart writer).
 */
export async function uploadFile(file: File, folder?: string): Promise<UploadedFile> {
  const form = new FormData();
  form.append('file', file);
  const qs = folder ? `?folder=${encodeURIComponent(folder)}` : '';
  return apiFetch<UploadedFile>(`/files${qs}`, { method: 'POST', body: form });
}
