'use client';

import { getAuthState, isAuthenticated } from '@/lib/auth-store';
import { apiFetch } from '@/lib/use-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** Notification shape returned by GET /notifications. */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  unread: number;
  total: number;
}

const KEY = ['notifications'];

/**
 * Notifications — the React port of the Nuxt variant's notifications store,
 * as react-query cache + mutations (the skill's session/shell category).
 * The bell renders even when the fetch fails; errors stay silent.
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery<NotificationsResponse>({
    queryKey: KEY,
    queryFn: () => apiFetch<NotificationsResponse>('/notifications'),
    enabled: isAuthenticatedSafe(),
    staleTime: 60_000,
  });

  function patch(readAt: string, ids?: string[]) {
    queryClient.setQueryData<NotificationsResponse>(KEY, (current) => {
      if (!current) return current;
      const hits = current.data.filter((n) => (ids ? ids.includes(n.id) : !n.readAt));
      const unread = Math.max(0, current.unread - hits.length);
      return {
        ...current,
        unread,
        data: current.data.map((n) =>
          (ids ? ids.includes(n.id) : !n.readAt) ? { ...n, readAt } : n,
        ),
      };
    });
  }

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch<null>(`/notifications/${id}/read`, { method: 'PATCH' }),
    onMutate: (id) => patch(new Date().toISOString(), [id]),
    onError: () => undefined,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiFetch<null>('/notifications/read-all', { method: 'PATCH' }),
    onMutate: () => patch(new Date().toISOString()),
    onError: () => undefined,
  });

  return {
    notifications: query.data?.data ?? [],
    unreadCount: query.data?.unread ?? 0,
    loading: query.isLoading,
    markRead,
    markAllRead,
  };
}

// The query's `enabled` runs during render on the client only; reading the
// auth store directly is safe there (defaults to logged-out during SSR).
function isAuthenticatedSafe(): boolean {
  if (typeof window === 'undefined') return false;
  return isAuthenticated(getAuthState());
}
