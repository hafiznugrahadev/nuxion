import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import type { BrandingSettings } from '@nuxion/shared-types';
import { UpdateBrandingDto } from './dto/update-branding.dto';

/** Settings row key for the branding group. */
const BRANDING_KEY = 'branding';
const CACHE_KEY = 'settings:branding';
const CACHE_TTL_SECONDS = 60;

/** Fallback when no row exists yet (mirrors the migration's default). */
export const DEFAULT_BRANDING: BrandingSettings = {
  appName: 'Nuxion',
  logoUrl: null,
  faviconUrl: null,
};

/**
 * Singleton-style settings groups (key → JSON value). Tiny module: injects
 * PrismaService directly (notifications-module precedent — the repository
 * layer is reserved for CRUD modules). Reads are Redis-cached (60s, wrapped in
 * safe() so a Redis outage degrades to the DB, never an error) because the web
 * SSR fetches branding on every server-rendered page.
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getBranding(): Promise<BrandingSettings> {
    const cached = await this.safe(() => this.redis.get<BrandingSettings>(CACHE_KEY));
    if (cached) return cached;

    const row = await this.prisma.setting.findUnique({ where: { key: BRANDING_KEY } });
    const branding = { ...DEFAULT_BRANDING, ...((row?.value ?? {}) as Partial<BrandingSettings>) };
    await this.safe(() => this.redis.set(CACHE_KEY, branding, CACHE_TTL_SECONDS));
    return branding;
  }

  async updateBranding(dto: UpdateBrandingDto): Promise<BrandingSettings> {
    const row = await this.prisma.setting.upsert({
      where: { key: BRANDING_KEY },
      update: { value: dto as unknown as object },
      create: { key: BRANDING_KEY, value: dto as unknown as object },
    });
    await this.safe(() => this.redis.del(CACHE_KEY));
    return row.value as unknown as BrandingSettings;
  }

  /** Run a cache operation, swallowing errors so Redis is never a hard dependency. */
  private async safe<R>(fn: () => Promise<R>): Promise<R | null> {
    try {
      return await fn();
    } catch (err) {
      this.logger.warn(`Settings cache unavailable: ${(err as Error).message}`);
      return null;
    }
  }
}
