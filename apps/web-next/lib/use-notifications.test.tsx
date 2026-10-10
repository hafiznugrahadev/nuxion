import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { clearSession, setSession } from './auth-store';
import { jsonRes, renderHook } from './test-render';
import { useNotifications } from './use-notifications';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
beforeEach(() => {
  // The query is enabled only with a live session (the bell lives behind auth).
  setSession({
    accessToken: 'tok',
    user: { id: 'u', name: 'U', roles: ['USER'], createdAt: '' } as never,
  });
});
afterEach(() => {
  fetchMock.mockReset();
  clearSession();
});

const LIST = {
  success: true,
  data: {
    data: [
      {
        id: 'n1',
        userId: 'u',
        title: 'One',
        body: 'b',
        type: 'info',
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n2',
        userId: 'u',
        title: 'Two',
        body: 'b',
        type: 'error',
        readAt: '2026-01-01T00:00:00Z',
        createdAt: new Date().toISOString(),
      },
    ],
    unread: 1,
    total: 2,
  },
};

function mount() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = renderHook(
    () => useNotifications(),
    (props) => <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

describe('useNotifications', () => {
  it('exposes the list and unread count from the API', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonRes(200, LIST)));
    const { result, unmount } = mount();
    // Wait for the query to settle.
    await vi.waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
    unmount();
  });

  it('markRead optimistically flips the item and decrements the count', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonRes(200, LIST)));
    const { result, rerender, unmount } = mount();
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.markRead.mutate('n1');
      await Promise.resolve();
    });
    // The harness's act() doesn't flush the observer notification from
    // setQueryData (verified against plain useQuery); an explicit rerender
    // stands in for the browser's scheduled re-render.
    rerender();
    expect(result.current.notifications.find((n) => n.id === 'n1')!.readAt).not.toBeNull();
    expect(result.current.unreadCount).toBe(0);
    // The already-read item is a no-op for the count.
    await act(async () => {
      result.current.markRead.mutate('n2');
      await Promise.resolve();
    });
    rerender();
    expect(result.current.unreadCount).toBe(0);
    unmount();
  });

  it('markAllRead marks everything and zeroes the count', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonRes(200, LIST)));
    const { result, rerender, unmount } = mount();
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.markAllRead.mutate();
      await Promise.resolve();
    });
    rerender();
    expect(result.current.notifications.every((n) => n.readAt)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    unmount();
  });
});
