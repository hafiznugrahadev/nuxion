import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { RedisService } from '@infrastructure/redis/redis.service';
import { DEFAULT_BRANDING, SettingsService } from '../settings.service';

function makeService(storedRow: unknown = null) {
  const prisma = {
    setting: {
      findUnique: vi.fn(async () => storedRow),
      upsert: vi.fn(async ({ create }: { create: { key: string; value: unknown } }) => ({
        key: create.key,
        value: create.value,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    },
  };
  const store = new Map<string, unknown>();
  const redis = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
  const service = new SettingsService(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
  );
  return { service, prisma, redis, store };
}

describe('SettingsService', () => {
  let ctx: ReturnType<typeof makeService>;

  beforeEach(() => {
    ctx = makeService();
  });

  describe('getBranding', () => {
    it('returns defaults when no row exists', async () => {
      const branding = await ctx.service.getBranding();
      expect(branding).toEqual(DEFAULT_BRANDING);
    });

    it('merges a stored row over the defaults (missing fields survive)', async () => {
      ctx = makeService({ key: 'branding', value: { appName: 'Acme' } });
      const branding = await ctx.service.getBranding();
      expect(branding).toEqual({ appName: 'Acme', logoUrl: null, faviconUrl: null });
    });

    it('caches the first read and skips the DB afterwards', async () => {
      await ctx.service.getBranding();
      await ctx.service.getBranding();
      expect(ctx.prisma.setting.findUnique).toHaveBeenCalledTimes(1);
      expect(ctx.store.get('settings:branding')).toBeTruthy();
    });

    it('degrades to the DB when Redis throws', async () => {
      (ctx.redis.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('down'));
      const branding = await ctx.service.getBranding();
      expect(branding).toEqual(DEFAULT_BRANDING);
    });
  });

  describe('updateBranding', () => {
    it('upserts the row and invalidates the cache', async () => {
      const result = await ctx.service.updateBranding({
        appName: 'Acme',
        logoUrl: 'http://api.local/uploads/branding/logo.png',
        faviconUrl: null,
      });
      expect(result.appName).toBe('Acme');
      expect(ctx.redis.del).toHaveBeenCalledWith('settings:branding');
    });
  });
});
