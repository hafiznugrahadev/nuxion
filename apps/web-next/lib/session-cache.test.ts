import { afterEach, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { clearSession, getSessionGeneration, setSession } from './auth-store';
import { bindSessionCache } from './session-cache';

const session = (id: string) => ({ accessToken: id, user: { id, name: id } as never });
afterEach(() => clearSession());

describe('session cache isolation', () => {
  it('removes private records on logout and direct account switches, retaining same-user refresh data', () => {
    const cache = new QueryClient();
    const unbind = bindSessionCache(cache);
    try {
      setSession(session('A'));
      cache.setQueryData(['notifications'], ['private-A']);
      setSession(session('A'));
      expect(cache.getQueryData(['notifications'])).toEqual(['private-A']);
      setSession(session('B'));
      expect(cache.getQueryData(['notifications'])).toBeUndefined();
      cache.setQueryData(['me'], 'private-B');
      clearSession();
      expect(cache.getQueryData(['me'])).toBeUndefined();
    } finally {
      unbind();
      cache.clear();
    }
  });

  it('cancels A requests so their late result cannot refill B cache', async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const unbind = bindSessionCache(cache);
    try {
      setSession(session('A'));
      let finish!: (value: string) => void;
      const pending = cache
        .fetchQuery({
          queryKey: ['me'],
          queryFn: () =>
            new Promise<string>((resolve) => {
              finish = resolve;
            }),
        })
        .catch(() => undefined);
      clearSession();
      setSession(session('B'));
      cache.setQueryData(['me'], 'private-B');
      finish('private-A');
      await pending;
      expect(cache.getQueryData(['me'])).toBe('private-B');
    } finally {
      unbind();
      cache.clear();
    }
  });

  it('rejects a session response that started before logout', () => {
    setSession(session('A'));
    const generation = getSessionGeneration();
    clearSession();
    expect(setSession(session('A'), generation)).toBe(false);
  });
});
