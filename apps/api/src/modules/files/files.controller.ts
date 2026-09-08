import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import {
  StorageService,
  type UploadedFile as MulterFile,
} from '@infrastructure/storage/storage.service';
import type { StoredFile } from '@infrastructure/storage/storage.types';

// Hard ceiling (safety net against OOM); the configurable business limit is
// enforced in StorageService from `storage.maxFileSizeBytes`.
const MAX_UPLOAD_CEILING = 15 * 1024 * 1024;

/**
 * Generic authenticated upload endpoint. Protected by the global JwtAuthGuard.
 * Returns the stored file's URL for callers to persist (e.g. avatarUrl).
 *
 * With a signed driver (s3, private bucket) the returned `url` is a STABLE proxy
 * (`/files/view?key=…`) that never expires; the browser hits it and gets a 302 to
 * a short-lived presigned URL (cached in Redis). With the local driver the `url`
 * is the direct public `/uploads` URL.
 */
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_CEILING } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file; returns its URL' })
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async upload(
    @UploadedFile() file: MulterFile,
    @Req() req: Request,
    @Query('folder') folder?: string,
  ): Promise<StoredFile> {
    const stored = await this.storage.upload(file, folder);
    // Public driver (local): the static URL is already browser-loadable.
    if (!this.storage.signed) return stored;
    // Private driver (s3): hand back a stable proxy URL, not the bare object URL
    // (which 403s without an anonymous policy and isn't presigned).
    return { ...stored, url: this.viewUrl(req, stored.key) };
  }

  @Public()
  @Get('view')
  @ApiOperation({ summary: 'Redirect to a (cached) presigned URL for a stored object' })
  async view(@Query('key') key: string, @Res() res: Response): Promise<void> {
    if (!key || key.includes('..') || key.startsWith('/')) {
      throw new BadRequestException('Invalid key');
    }
    const target = await this.storage.displayUrl(key);
    // Let the browser reuse the redirect briefly (well under the presign TTL) so a
    // re-render doesn't re-hit this endpoint for every <img> paint.
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.redirect(302, target);
  }

  /** Absolute, stable URL to the view endpoint for `key`, honouring the proxy host. */
  private viewUrl(req: Request, key: string): string {
    const proto = (forwarded(req, 'x-forwarded-proto') ?? req.protocol ?? 'http').split(',')[0];
    const host = forwarded(req, 'x-forwarded-host') ?? req.get('host') ?? 'localhost';
    return `${proto}://${host}/api/files/view?key=${encodeURIComponent(key)}`;
  }
}

/** First value of a possibly comma-joined / array forwarded header. */
function forwarded(req: Request, name: string): string | undefined {
  const raw = req.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}
