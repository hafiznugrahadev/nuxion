import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { QueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '~/stores/auth';
import { useNotificationsStore } from '~/stores/notifications';
import { bindSessionCache } from './session-cache';

vi.mock('~/composables/useApi', () => ({ useApi: () => vi.fn() }));
beforeEach(() => setActivePinia(createPinia()));
const session = (id: string) => ({ accessToken: id, user: { id, name: id } as never });

describe('session cache isolation', () => {
  it('clears queries and notification fetched state when accounts change or logout', () => {
    const auth = useAuthStore();
    const notifications = useNotificationsStore();
    const cache = new QueryClient();
    const unbind = bindSessionCache(auth, cache, notifications);
    try {
      auth.setSession(session('A'));
      notifications.notifications = [{ id: 'private-A' } as never];
      notifications.fetched = true;
      notifications.unreadCount = 1;
      cache.setQueryData(['me'], 'private-A');
      auth.setSession(session('A'));
      expect(cache.getQueryData(['me'])).toBe('private-A');
      auth.setSession(session('B'));
      expect(notifications.notifications).toEqual([]);
      expect(notifications.fetched).toBe(false);
      expect(notifications.unreadCount).toBe(0);
      expect(cache.getQueryData(['me'])).toBeUndefined();
      cache.setQueryData(['me'], 'private-B');
      auth.clear();
      expect(cache.getQueryData(['me'])).toBeUndefined();
    } finally {
      unbind();
      cache.clear();
    }
  });

  it('rejects a session response that started before logout', () => {
    const auth = useAuthStore();
    auth.setSession(session('A'));
    const generation = auth.sessionGeneration;
    auth.clear();
    expect(auth.setSession(session('A'), generation)).toBe(false);
    expect(auth.user).toBeNull();
  });
});
