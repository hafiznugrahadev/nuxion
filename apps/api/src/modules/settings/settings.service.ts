import { Injectable, Logger } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import type { Database } from '@db/relations';
import { settings } from '@db/schema';
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
 * the Drizzle database directly (notifications-module precedent — the
 * repository layer is reserved for CRUD modules). Reads are Redis-cached
 * (60s, wrapped in safe() so a Redis outage degrades to the DB, never an
 * error) because the web SSR fetches branding on every server-rendered page.
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectDrizzle()
    private readonly db: Database,
    private readonly redis: RedisService,
  ) {}

  async getBranding(): Promise<BrandingSettings> {
    const cached = await this.safe(() => this.redis.get<BrandingSettings>(CACHE_KEY));
    if (cached) return cached;

    const [row] = await this.db
      .select()
      .from(settings)
      .where(eq(settings.key, BRANDING_KEY))
      .limit(1);
    const branding = { ...DEFAULT_BRANDING, ...((row?.value ?? {}) as Partial<BrandingSettings>) };
    await this.safe(() => this.redis.set(CACHE_KEY, branding, CACHE_TTL_SECONDS));
    return branding;
  }

  async updateBranding(dto: UpdateBrandingDto): Promise<BrandingSettings> {
    const [row] = await this.db
      .insert(settings)
      .values({ key: BRANDING_KEY, value: dto as unknown as object })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: dto as unknown as object, updatedAt: new Date() },
      })
      .returning();
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
