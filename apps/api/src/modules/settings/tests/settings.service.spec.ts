import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RedisService } from '@infrastructure/redis/redis.service';
import { mockDb } from '../../../../test/helpers/mock-db';
import { DEFAULT_BRANDING, SettingsService } from '../settings.service';

function makeService(storedRow: unknown = null, insertValue: unknown = null) {
  const { db, calls } = mockDb({
    select: storedRow ? [storedRow] : [],
    insert: insertValue !== null ? [{ value: insertValue }] : [],
  });
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
  const service = new SettingsService(db, redis as unknown as RedisService);
  return { service, db, redis, store, calls };
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
      expect(ctx.db.select).toHaveBeenCalledTimes(1);
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
      const dto = {
        appName: 'Acme',
        logoUrl: 'http://api.local/uploads/branding/logo.png',
        faviconUrl: null,
      };
      ctx = makeService(null, dto);
      const result = await ctx.service.updateBranding(dto);
      expect(result.appName).toBe('Acme');
      expect(ctx.calls.onConflictDoUpdate).toBeTruthy();
      expect(ctx.redis.del).toHaveBeenCalledWith('settings:branding');
    });
  });
});
