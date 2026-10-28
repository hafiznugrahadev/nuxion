import { defineStore } from 'pinia';
import { useApi } from '~/composables/useApi';
import { ref } from 'vue';

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

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const fetched = ref(false);
  let generation = 0;

  function reset() {
    generation++;
    notifications.value = [];
    unreadCount.value = 0;
    loading.value = false;
    fetched.value = false;
  }

  async function fetch() {
    const started = generation;
    loading.value = true;
    try {
      const api = useApi();
      const res = await api<{ success: boolean; data: NotificationsResponse }>('/notifications');
      if (started !== generation) return;
      notifications.value = res.data.data;
      unreadCount.value = res.data.unread;
      fetched.value = true;
    } catch {
      // silently ignore — bell still renders without count
    } finally {
      if (started === generation) loading.value = false;
    }
  }

  async function markRead(id: string) {
    try {
      const api = useApi();
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      const n = notifications.value.find((n) => n.id === id);
      if (n && !n.readAt) {
        n.readAt = new Date().toISOString();
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    } catch {
      //
    }
  }

  async function markAllRead() {
    try {
      const api = useApi();
      await api('/notifications/read-all', { method: 'PATCH' });
      notifications.value.forEach((n) => {
        if (!n.readAt) n.readAt = new Date().toISOString();
      });
      unreadCount.value = 0;
    } catch {
      //
    }
  }

  return { notifications, unreadCount, loading, fetched, fetch, markRead, markAllRead, reset };
});
