import { Controller, Get, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { FileUploadErrorsInterceptor } from '@common/interceptors/file-upload-errors.interceptor';
import {
  StorageService,
  type UploadedFile as MulterFile,
} from '@infrastructure/storage/storage.service';
import type { StoredFile } from '@infrastructure/storage/storage.types';
import { ViewFileDto } from './dto/view-file.dto';

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
  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  // Uploads are the API's most expensive request — cap well under the global limit.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  @ApiBearerAuth()
  @UseInterceptors(
    FileUploadErrorsInterceptor,
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_CEILING } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file; returns its URL' })
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async upload(
    @UploadedFile() file: MulterFile,
    @Query('folder') folder?: string,
  ): Promise<StoredFile> {
    const stored = await this.storage.upload(file, folder);
    // Public driver (local): the static URL is already browser-loadable.
    if (!this.storage.signed) return stored;
    // Private driver (s3): hand back a stable proxy URL, not the bare object URL
    // (which 403s without an anonymous policy and isn't presigned).
    return { ...stored, url: this.viewUrl(stored.key) };
  }

  @Public()
  @Get('view')
  @ApiOperation({ summary: 'Redirect to a (cached) presigned URL for a stored object' })
  async view(@Query() query: ViewFileDto, @Res() res: Response): Promise<void> {
    const target = await this.storage.displayUrl(query.key);
    // Let the browser reuse the redirect briefly (well under the presign TTL) so a
    // re-render doesn't re-hit this endpoint for every <img> paint.
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.redirect(302, target);
  }

  private viewUrl(key: string): string {
    const origin = this.config.getOrThrow<string>('app.appUrl').replace(/\/+$/, '');
    const prefix = this.config.get<string>('app.apiPrefix') ?? 'api';
    return `${origin}/${prefix}/files/view?key=${encodeURIComponent(key)}`;
  }
}
